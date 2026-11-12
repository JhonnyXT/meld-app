import { AppState } from 'react-native';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { categoryRepository } from '@/data/local/categoryRepository';
import { spaceMemberRepository } from '@/data/local/spaceMemberRepository';
import { dayItemRepository, type PendingDayItem } from '@/data/local/dayItemRepository';
import { habitCompletionSyncRepository, type PendingCompletion } from '@/data/local/habitCompletionRepository';
import { taskCompletionSyncRepository } from '@/data/local/taskCompletionRepository';
import { onLocalChange } from '@/data/local/localChanges';
import { wipeLocalData } from '@/data/local/wipeLocalData';
import type { IconName } from '@/domain/iconNames';
import type { SpaceRole } from '@/domain/category';
import { generateInviteCode } from '@/domain/inviteCode';
import { useCategoriesStore } from '@/store/categoriesStore';
import { useDayItemsStore } from '@/store/dayItemsStore';
import { useInboxStore } from '@/store/inboxStore';
import { useSettingsStore } from '@/store/settingsStore';
import { cancelReminderNotification, syncReminderNotification } from '@/services/notifications';
import { refreshAppBadge } from '@/services/appBadge';
import { refreshWidgets } from '@/widget/refreshWidgets';
import { ensureFirebase } from './firebase';
import { pickWinner } from './merge';
import {
  categoryToDoc,
  dayItemToDoc,
  dayItemToSpaceDoc,
  docToCategory,
  docToDayItem,
  docToDayItemFromSpace,
  habitCompletionToDoc,
  taskCompletionToDoc,
  tombstoneDoc,
  type AppSettingsDoc,
  type CategoryDoc,
  type DayItemDoc,
  type HabitCompletionDoc,
  type SpaceDoc,
  type SpaceItemDoc,
  type TaskCompletionDoc,
} from './mappers';
import { advanceCursor, forgetSpace, spaceCursorKey, type SyncMeta } from './meta';
import { clearMeta, loadMeta, saveMeta } from './metaStore';
import {
  createInviteCode,
  createSpaceDoc,
  deleteAllUserData,
  deletePersonalDocs,
  deleteSpace,
  discoverSpaces,
  getInviteCode,
  getSpaceConfig,
  getSpaceDoc,
  getUserSettingsDoc,
  joinSpace,
  leaveSpace,
  listSpaceMembers,
  pullCollection,
  pullSpaceCollection,
  pushBatch,
  pushSpaceBatch,
  removeSpaceMember,
  reviveSpaceDoc,
  setSpaceConfig,
  setSpaceEditorUids,
  setSpaceMember,
  setUserSettingsDoc,
  type PushOp,
} from './remote';
import { isOffline, withTimeout } from './net';
import { deleteAccount, signOut } from './session';
import { useSyncStatus } from './status';

const OFFLINE_RETRY_MS = 60000;
const LOCAL_CHANGE_DEBOUNCE_MS = 3000;
const FOREGROUND_MIN_INTERVAL_MS = 30000;

function hasBackupPlan(): boolean {
  return useSettingsStore.getState().plan === 'pro';
}

async function pullItems(uid: string, meta: SyncMeta): Promise<{ meta: SyncMeta; changed: boolean }> {
  const docs = await withTimeout(pullCollection<DayItemDoc>(uid, 'items', meta.cursors.items ?? 0));
  let changed = false;
  for (const d of docs) {
    const local = await dayItemRepository.getSyncVersion(d.id);
    if (local && pickWinner(local, d.data) !== 'remote') continue;
    changed = true;
    if (d.data.deletedAt != null) {
      await dayItemRepository.applyRemoteDelete(d.id, d.data.deletedAt);
      await cancelReminderNotification(d.id).catch(() => undefined);
    } else {
      const item = docToDayItem(d.id, d.data);
      await dayItemRepository.applyRemoteUpsert(item, d.data.categoryId);
      await syncReminderNotification(item).catch(() => undefined);
    }
  }
  if (docs.length > 0) meta = advanceCursor(meta, 'items', Math.max(...docs.map((d) => d.serverUpdatedAt)));
  return { meta, changed };
}

async function pullHabitCompletions(uid: string, meta: SyncMeta): Promise<SyncMeta> {
  const docs = await withTimeout(
    pullCollection<HabitCompletionDoc>(uid, 'habitCompletions', meta.cursors.habitCompletions ?? 0),
  );
  for (const d of docs) {
    const local = await habitCompletionSyncRepository.getSyncVersion(d.id);
    if (local && pickWinner(local, d.data) !== 'remote') continue;
    if (d.data.deletedAt != null) {
      await habitCompletionSyncRepository.applyRemoteDelete(d.id, d.data.habitId, d.data.date, d.data.deletedAt);
    } else {
      await habitCompletionSyncRepository.applyRemoteUpsert(d.id, d.data.habitId, d.data.date, d.data.updatedAt);
    }
  }
  if (docs.length > 0) meta = advanceCursor(meta, 'habitCompletions', Math.max(...docs.map((d) => d.serverUpdatedAt)));
  return meta;
}

async function pullTaskCompletions(uid: string, meta: SyncMeta): Promise<SyncMeta> {
  const docs = await withTimeout(
    pullCollection<TaskCompletionDoc>(uid, 'taskCompletions', meta.cursors.taskCompletions ?? 0),
  );
  for (const d of docs) {
    const local = await taskCompletionSyncRepository.getSyncVersion(d.id);
    if (local && pickWinner(local, d.data) !== 'remote') continue;
    if (d.data.deletedAt != null) {
      await taskCompletionSyncRepository.applyRemoteDelete(d.id, d.data.taskId, d.data.date, d.data.deletedAt);
    } else {
      await taskCompletionSyncRepository.applyRemoteUpsert(d.id, d.data.taskId, d.data.date, d.data.updatedAt);
    }
  }
  if (docs.length > 0) meta = advanceCursor(meta, 'taskCompletions', Math.max(...docs.map((d) => d.serverUpdatedAt)));
  return meta;
}

async function pullCategories(uid: string, meta: SyncMeta): Promise<{ meta: SyncMeta; changed: boolean }> {
  const docs = await withTimeout(pullCollection<CategoryDoc>(uid, 'categories', meta.cursors.categories ?? 0));
  let changed = false;
  for (const d of docs) {
    const local = await categoryRepository.getSyncVersion(d.id);
    if (local && pickWinner(local, d.data) !== 'remote') continue;
    changed = true;
    if (d.data.deletedAt != null) {
      await categoryRepository.applyRemoteDelete(d.id, d.data.deletedAt);
    } else {
      await categoryRepository.applyRemoteUpsert(docToCategory(d.id, d.data), d.data.updatedAt);
    }
  }
  if (docs.length > 0) meta = advanceCursor(meta, 'categories', Math.max(...docs.map((d) => d.serverUpdatedAt)));
  return { meta, changed };
}

async function pull(uid: string, meta: SyncMeta): Promise<SyncMeta> {
  const items = await pullItems(uid, meta);
  meta = await pullHabitCompletions(uid, items.meta);
  meta = await pullTaskCompletions(uid, meta);
  const cats = await pullCategories(uid, meta);
  meta = cats.meta;
  if (items.changed || cats.changed) {
    await refreshWidgets().catch(() => undefined);
  }
  if (items.changed) await useDayItemsStore.getState().reload();
  if (cats.changed) await useCategoriesStore.getState().load();
  return meta;
}

async function pushItems(uid: string): Promise<void> {
  const pending = (await dayItemRepository.listPendingSync()).filter((p) => p.spaceId == null);
  if (pending.length === 0) return;
  const ops: PushOp[] = pending.map((p) => ({
    kind: 'items',
    id: p.id,
    data: p.item ? dayItemToDoc(p.item, p.categoryId) : tombstoneDoc(p.deletedAt!),
  }));
  await withTimeout(pushBatch(uid, ops));
  await dayItemRepository.markSynced(pending.map((p) => p.id));
}

async function pushHabitCompletions(uid: string): Promise<void> {
  const pending = (await habitCompletionSyncRepository.listPendingSync()).filter((p) => p.spaceId == null);
  if (pending.length === 0) return;
  const ops: PushOp[] = pending.map((p) => ({
    kind: 'habitCompletions',
    id: p.id,
    data: p.deletedAt
      ? tombstoneDoc(p.deletedAt)
      : habitCompletionToDoc({ habitId: p.habitId!, date: p.date, updatedAt: p.updatedAt, deletedAt: null }),
  }));
  await withTimeout(pushBatch(uid, ops));
  await habitCompletionSyncRepository.markSynced(pending.map((p) => p.id));
}

async function pushTaskCompletions(uid: string): Promise<void> {
  const pending = (await taskCompletionSyncRepository.listPendingSync()).filter((p) => p.spaceId == null);
  if (pending.length === 0) return;
  const ops: PushOp[] = pending.map((p) => ({
    kind: 'taskCompletions',
    id: p.id,
    data: p.deletedAt
      ? tombstoneDoc(p.deletedAt)
      : taskCompletionToDoc({ taskId: p.taskId!, date: p.date, updatedAt: p.updatedAt, deletedAt: null }),
  }));
  await withTimeout(pushBatch(uid, ops));
  await taskCompletionSyncRepository.markSynced(pending.map((p) => p.id));
}

async function pushCategories(uid: string): Promise<void> {
  const pending = (await categoryRepository.listPendingSync()).filter((p) => p.spaceId == null);
  if (pending.length === 0) return;
  const ops: PushOp[] = pending.map((p) => ({
    kind: 'categories',
    id: p.id,
    data: p.category ? categoryToDoc(p.category, p.updatedAt) : tombstoneDoc(p.deletedAt!),
  }));
  await withTimeout(pushBatch(uid, ops));
  await categoryRepository.markSynced(pending.map((p) => p.id));
}

async function push(uid: string): Promise<void> {
  await pushItems(uid);
  await pushHabitCompletions(uid);
  await pushTaskCompletions(uid);
  await pushCategories(uid);
}

function myRole(data: SpaceDoc, uid: string): SpaceRole {
  return (data.editorUids ?? data.memberUids).includes(uid) ? 'editor' : 'viewer';
}

async function pullSpaceItems(spaceId: string, meta: SyncMeta): Promise<{ meta: SyncMeta; changed: boolean }> {
  const key = spaceCursorKey(spaceId, 'items');
  const docs = await withTimeout(pullSpaceCollection<SpaceItemDoc>(spaceId, 'items', meta.cursors[key] ?? 0));
  let changed = false;
  for (const d of docs) {
    const local = await dayItemRepository.getSyncVersion(d.id);
    if (local && pickWinner(local, d.data) !== 'remote') continue;
    changed = true;
    if (d.data.deletedAt != null) {
      await dayItemRepository.applyRemoteDelete(d.id, d.data.deletedAt);
      await cancelReminderNotification(d.id).catch(() => undefined);
    } else {
      const item = docToDayItemFromSpace(d.id, d.data);
      await dayItemRepository.applySpaceRemoteUpsert(item, spaceId, d.data.completedByUid ?? null);
      await syncReminderNotification(item).catch(() => undefined);
    }
  }
  if (docs.length > 0) meta = advanceCursor(meta, key, Math.max(...docs.map((d) => d.serverUpdatedAt)));
  return { meta, changed };
}

async function pullSpaceHabitCompletions(spaceId: string, meta: SyncMeta): Promise<SyncMeta> {
  const key = spaceCursorKey(spaceId, 'habitCompletions');
  const docs = await withTimeout(pullSpaceCollection<HabitCompletionDoc>(spaceId, 'habitCompletions', meta.cursors[key] ?? 0));
  for (const d of docs) {
    const local = await habitCompletionSyncRepository.getSyncVersion(d.id);
    if (local && pickWinner(local, d.data) !== 'remote') continue;
    if (d.data.deletedAt != null) {
      await habitCompletionSyncRepository.applyRemoteDelete(d.id, d.data.habitId, d.data.date, d.data.deletedAt);
    } else {
      await habitCompletionSyncRepository.applySpaceRemoteUpsert(
        d.id,
        d.data.habitId,
        d.data.date,
        d.data.updatedAt,
        spaceId,
        d.data.byUid ?? null,
      );
    }
  }
  if (docs.length > 0) meta = advanceCursor(meta, key, Math.max(...docs.map((d) => d.serverUpdatedAt)));
  return meta;
}

async function pullSpaceTaskCompletions(spaceId: string, meta: SyncMeta): Promise<SyncMeta> {
  const key = spaceCursorKey(spaceId, 'taskCompletions');
  const docs = await withTimeout(pullSpaceCollection<TaskCompletionDoc>(spaceId, 'taskCompletions', meta.cursors[key] ?? 0));
  for (const d of docs) {
    const local = await taskCompletionSyncRepository.getSyncVersion(d.id);
    if (local && pickWinner(local, d.data) !== 'remote') continue;
    if (d.data.deletedAt != null) {
      await taskCompletionSyncRepository.applyRemoteDelete(d.id, d.data.taskId, d.data.date, d.data.deletedAt);
    } else {
      await taskCompletionSyncRepository.applySpaceRemoteUpsert(
        d.id,
        d.data.taskId,
        d.data.date,
        d.data.updatedAt,
        spaceId,
        d.data.byUid ?? null,
      );
    }
  }
  if (docs.length > 0) meta = advanceCursor(meta, key, Math.max(...docs.map((d) => d.serverUpdatedAt)));
  return meta;
}

async function pullSpaces(uid: string, meta: SyncMeta): Promise<{ meta: SyncMeta; changed: boolean }> {
  const remote = await withTimeout(discoverSpaces(uid));
  const alive = remote.filter((s) => s.data.deletedAt == null);
  const aliveIds = new Set(alive.map((s) => s.id));
  let changed = false;

  const linked = await categoryRepository.listSpaceLinked();
  for (const cat of linked) {
    const spaceId = cat.space!.spaceId;
    if (aliveIds.has(spaceId)) continue;
    await categoryRepository.unlinkSpace(spaceId);
    await dayItemRepository.unlinkSpace(spaceId);
    await habitCompletionSyncRepository.unlinkSpace(spaceId);
    await taskCompletionSyncRepository.unlinkSpace(spaceId);
    meta = forgetSpace(meta, spaceId);
    changed = true;
  }

  for (const s of alive) {
    const role = myRole(s.data, uid);
    const config = await withTimeout(getSpaceConfig(s.id));
    await categoryRepository.applySpaceUpsert(
      s.id,
      role,
      s.data.ownerUid,
      config ? { label: config.data.label, icon: config.data.icon as IconName, color: config.data.color } : null,
    );
    if (config) changed = true;

    const members = await withTimeout(listCategoryMembers(s.id)).catch(() => []);
    if (members.length > 0) await spaceMemberRepository.upsertMany(s.id, members);

    const items = await pullSpaceItems(s.id, meta);
    meta = items.meta;
    meta = await pullSpaceHabitCompletions(s.id, meta);
    meta = await pullSpaceTaskCompletions(s.id, meta);
    if (items.changed) changed = true;
  }

  return { meta, changed };
}

interface SpacePushGroup {
  items: PendingDayItem[];
  habits: PendingCompletion[];
  tasks: PendingCompletion[];
}

function spaceGroup(map: Map<string, SpacePushGroup>, spaceId: string): SpacePushGroup {
  let g = map.get(spaceId);
  if (!g) {
    g = { items: [], habits: [], tasks: [] };
    map.set(spaceId, g);
  }
  return g;
}

async function resolveCompletedByUidForPush(
  current: string | null,
  isDone: boolean,
  persist: (uid: string) => Promise<void>,
): Promise<string | null> {
  if (!isDone || current) return isDone ? current : null;
  const uid = currentUid();
  if (!uid) return null;
  await persist(uid);
  return uid;
}

async function pushSpaces(): Promise<void> {
  const [items, habits, tasks, cats] = await Promise.all([
    dayItemRepository.listPendingSync(),
    habitCompletionSyncRepository.listPendingSync(),
    taskCompletionSyncRepository.listPendingSync(),
    categoryRepository.listPendingSync(),
  ]);

  const bySpace = new Map<string, SpacePushGroup>();
  for (const p of items) if (p.spaceId) spaceGroup(bySpace, p.spaceId).items.push(p);
  for (const p of habits) if (p.spaceId) spaceGroup(bySpace, p.spaceId).habits.push(p);
  for (const p of tasks) if (p.spaceId) spaceGroup(bySpace, p.spaceId).tasks.push(p);

  for (const [spaceId, group] of bySpace) {
    const ops: PushOp[] = [];
    for (const p of group.items) {
      if (!p.item) {
        ops.push({ kind: 'items', id: p.id, data: tombstoneDoc(p.deletedAt!) });
        continue;
      }
      const completedByUid = await resolveCompletedByUidForPush(p.completedByUid, p.item.status === 'done', async (uid) => {
        await dayItemRepository.setCompletedByUid(p.id, uid);
      });
      ops.push({ kind: 'items', id: p.id, data: dayItemToSpaceDoc(p.item, completedByUid) });
    }
    for (const p of group.habits) {
      if (p.deletedAt) {
        ops.push({ kind: 'habitCompletions', id: p.id, data: tombstoneDoc(p.deletedAt) });
        continue;
      }
      const byUid = await resolveCompletedByUidForPush(p.completedByUid, true, async (uid) => {
        await habitCompletionSyncRepository.setCompletedByUid(p.id, uid);
      });
      ops.push({
        kind: 'habitCompletions',
        id: p.id,
        data: habitCompletionToDoc({ habitId: p.habitId!, date: p.date, updatedAt: p.updatedAt, deletedAt: null, byUid }),
      });
    }
    for (const p of group.tasks) {
      if (p.deletedAt) {
        ops.push({ kind: 'taskCompletions', id: p.id, data: tombstoneDoc(p.deletedAt) });
        continue;
      }
      const byUid = await resolveCompletedByUidForPush(p.completedByUid, true, async (uid) => {
        await taskCompletionSyncRepository.setCompletedByUid(p.id, uid);
      });
      ops.push({
        kind: 'taskCompletions',
        id: p.id,
        data: taskCompletionToDoc({ taskId: p.taskId!, date: p.date, updatedAt: p.updatedAt, deletedAt: null, byUid }),
      });
    }
    if (ops.length > 0) await withTimeout(pushSpaceBatch(spaceId, ops));
    if (group.items.length > 0) await dayItemRepository.markSynced(group.items.map((p) => p.id));
    if (group.habits.length > 0) await habitCompletionSyncRepository.markSynced(group.habits.map((p) => p.id));
    if (group.tasks.length > 0) await taskCompletionSyncRepository.markSynced(group.tasks.map((p) => p.id));
  }

  for (const p of cats) {
    if (!p.spaceId) continue;
    if (p.category) {
      await withTimeout(
        setSpaceConfig(p.spaceId, {
          label: p.category.label,
          icon: p.category.icon,
          color: p.category.color,
          updatedAt: p.updatedAt,
        }),
      );
    }
    await categoryRepository.markSynced([p.id]);
  }
}

const INVITE_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function shareCategory(categoryId: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error('shareCategory: sin sesión');
  const cat = (await categoryRepository.list()).find((c) => c.id === categoryId);
  if (!cat) throw new Error('shareCategory: categoría no encontrada');
  if (cat.space) throw new Error('shareCategory: ya está compartida');

  const now = new Date().toISOString();
  // Puede haber sido un espacio antes — ver docs/adr/0003-revivir-espacio-eliminado.md.
  const existing = await withTimeout(getSpaceDoc(categoryId)).catch(() => null);
  if (existing && existing.ownerUid === uid) {
    await withTimeout(reviveSpaceDoc(categoryId, uid));
  } else {
    await withTimeout(createSpaceDoc(categoryId, { ownerUid: uid, memberUids: [uid], editorUids: [uid], createdAt: now, deletedAt: null }));
  }
  await withTimeout(setSpaceConfig(categoryId, { label: cat.label, icon: cat.icon, color: cat.color, updatedAt: now }));
  // ver docs/adr/0011-dueno-necesita-su-propia-fila-de-miembro.md
  const displayName = getAuth().currentUser?.displayName ?? '';
  await withTimeout(setSpaceMember(categoryId, uid, { name: displayName, joinedAt: now, updatedAt: now })).catch(() => undefined);
  await withTimeout(deletePersonalDocs(uid, 'categories', [categoryId])).catch(() => undefined);

  await categoryRepository.setSpaceLink(categoryId, { spaceId: categoryId, role: 'editor', ownerUid: uid });

  const { itemIds, habitIds, taskIds } = await dayItemRepository.migrateCategoryToSpace(categoryId);
  const habitCompletionIds = await habitCompletionSyncRepository.migrateForHabits(habitIds, categoryId);
  const taskCompletionIds = await taskCompletionSyncRepository.migrateForTasks(taskIds, categoryId);
  await Promise.all([
    withTimeout(deletePersonalDocs(uid, 'items', itemIds)),
    withTimeout(deletePersonalDocs(uid, 'habitCompletions', habitCompletionIds)),
    withTimeout(deletePersonalDocs(uid, 'taskCompletions', taskCompletionIds)),
  ]).catch(() => undefined);

  await useCategoriesStore.getState().load();
  requestSync({ pull: false });
}

export async function createCategoryInviteCode(spaceId: string, role: 'editor' | 'viewer'): Promise<string> {
  const uid = currentUid();
  if (!uid) throw new Error('createCategoryInviteCode: sin sesión');
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    try {
      await withTimeout(createInviteCode(code, { spaceId, createdBy: uid, role, expiresAtMs: Date.now() + INVITE_CODE_TTL_MS }));
      return code;
    } catch (e) {
      if (attempt === 4) throw e;
    }
  }
  throw new Error('createCategoryInviteCode: no se pudo generar un código');
}

export type JoinCodeErrorKind = 'no-session' | 'invalid-code' | 'expired-code' | 'free-limit' | 'denied';

export class JoinCodeError extends Error {
  constructor(readonly kind: JoinCodeErrorKind) {
    super(`joinCategoryWithCode:${kind}`);
  }
}

const FREE_INVITEE_LIMIT = 2;

async function invitedCategoryCount(uid: string): Promise<number> {
  const linked = await categoryRepository.listSpaceLinked();
  return linked.filter((c) => c.space!.ownerUid !== uid).length;
}

export async function joinCategoryWithCode(rawCode: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new JoinCodeError('no-session');

  if ((await invitedCategoryCount(uid)) >= FREE_INVITEE_LIMIT && useSettingsStore.getState().plan !== 'pro') {
    throw new JoinCodeError('free-limit');
  }

  const code = rawCode.trim().toUpperCase();
  const invite = await withTimeout(getInviteCode(code)).catch(() => null);
  if (!invite) throw new JoinCodeError('invalid-code');
  if (invite.expiresAtMs <= Date.now()) throw new JoinCodeError('expired-code');

  try {
    await withTimeout(joinSpace(invite.spaceId, uid, { joinCode: code, asEditor: invite.role === 'editor' }));
  } catch {
    throw new JoinCodeError('denied');
  }

  const displayName = getAuth().currentUser?.displayName ?? '';
  const now = new Date().toISOString();
  await withTimeout(setSpaceMember(invite.spaceId, uid, { name: displayName, joinedAt: now, updatedAt: now })).catch(() => undefined);

  requestSync({ pull: true });
}

export interface SpaceMemberInfo {
  uid: string;
  name: string;
  role: SpaceRole;
  isOwner: boolean;
}

// ver docs/adr/0011-dueno-necesita-su-propia-fila-de-miembro.md
export async function ensureMyMemberRow(spaceId: string): Promise<void> {
  const uid = currentUid();
  if (!uid) return;
  const now = new Date().toISOString();
  const displayName = getAuth().currentUser?.displayName ?? '';
  await withTimeout(setSpaceMember(spaceId, uid, { name: displayName, joinedAt: now, updatedAt: now })).catch(() => undefined);
}

export async function listCategoryMembers(spaceId: string): Promise<SpaceMemberInfo[]> {
  const [space, members] = await Promise.all([withTimeout(getSpaceDoc(spaceId)), withTimeout(listSpaceMembers(spaceId))]);
  if (!space) return [];
  const nameByUid = new Map(members.map((m) => [m.id, m.data.name]));
  const editorSet = new Set(space.editorUids ?? space.memberUids);
  return space.memberUids.map((uid) => ({
    uid,
    name: nameByUid.get(uid) || uid,
    role: editorSet.has(uid) ? 'editor' : 'viewer',
    isOwner: uid === space.ownerUid,
  }));
}

export async function changeMemberRole(spaceId: string, memberUid: string, role: SpaceRole): Promise<void> {
  const space = await withTimeout(getSpaceDoc(spaceId));
  if (!space) throw new Error('changeMemberRole: espacio no encontrado');
  const next = new Set(space.editorUids ?? space.memberUids);
  if (role === 'editor') next.add(memberUid);
  else next.delete(memberUid);
  next.add(space.ownerUid);
  await withTimeout(setSpaceEditorUids(spaceId, Array.from(next)));
}

export async function removeMemberFromCategory(spaceId: string, memberUid: string): Promise<void> {
  await withTimeout(removeSpaceMember(spaceId, memberUid));
}

async function unlinkSpaceLocally(spaceId: string): Promise<void> {
  await categoryRepository.unlinkSpace(spaceId);
  await dayItemRepository.unlinkSpace(spaceId);
  await habitCompletionSyncRepository.unlinkSpace(spaceId);
  await taskCompletionSyncRepository.unlinkSpace(spaceId);
  const meta = await loadMeta();
  await saveMeta(forgetSpace(meta, spaceId));
  await useCategoriesStore.getState().load();
}

export async function leaveCategorySpace(spaceId: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error('leaveCategorySpace: sin sesión');
  await withTimeout(leaveSpace(spaceId, uid));
  await unlinkSpaceLocally(spaceId);
}

export async function deleteCategorySpace(spaceId: string): Promise<void> {
  await withTimeout(deleteSpace(spaceId));
  await unlinkSpaceLocally(spaceId);
}

const SETTINGS_EPOCH = '1970-01-01T00:00:00.000Z';

function localSettingsDoc(): AppSettingsDoc {
  const s = useSettingsStore.getState();
  return {
    theme: s.themePreference,
    accent: s.accent,
    language: s.language,
    listSpacing: s.listSpacing,
    completedItemStyle: s.completedItemStyle,
    habitsInToday: s.habitsInTodayEnabled,
    coolHabits: s.coolHabitsEnabled,
    onboardingCompleted: s.onboardingCompleted,
    updatedAt: s.settingsUpdatedAt ?? SETTINGS_EPOCH,
  };
}

async function syncSettings(uid: string, canBackup: boolean): Promise<void> {
  const remote = await getUserSettingsDoc(uid);
  const local = localSettingsDoc();
  if (remote && pickWinner(local, remote.data) === 'remote') {
    useSettingsStore.getState().applyRemoteSettings(remote.data);
    return;
  }
  if (canBackup && useSettingsStore.getState().settingsUpdatedAt) {
    await withTimeout(setUserSettingsDoc(uid, local));
  }
}

export async function pendingChanges(): Promise<number> {
  const [items, habits, tasks, cats] = await Promise.all([
    dayItemRepository.listPendingSync(),
    habitCompletionSyncRepository.listPendingSync(),
    taskCompletionSyncRepository.listPendingSync(),
    categoryRepository.listPendingSync(),
  ]);
  return items.length + habits.length + tasks.length + cats.length;
}

let running: Promise<void> | null = null;
let again: { pull: boolean } | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function currentUid(): string | null {
  ensureFirebase();
  return getAuth().currentUser?.uid ?? null;
}

async function syncOnce(uid: string, opts: { pull: boolean }): Promise<void> {
  const status = useSyncStatus.getState();
  let meta = await loadMeta();
  const canBackup = hasBackupPlan();
  status.set({ phase: 'syncing' });
  try {
    if (opts.pull) {
      meta = await pull(uid, meta);
      const spaces = await pullSpaces(uid, meta);
      meta = spaces.meta;
      if (spaces.changed) {
        await refreshWidgets().catch(() => undefined);
        await useDayItemsStore.getState().reload();
        await useCategoriesStore.getState().load();
      }
    }
    await syncSettings(uid, canBackup);
    if (canBackup) await push(uid);
    await pushSpaces();
    meta = { ...meta, lastSyncAt: Date.now() };
    await saveMeta(meta);
    status.set({ phase: canBackup ? 'idle' : 'paused', lastSyncAt: meta.lastSyncAt, pending: await pendingChanges() });
  } catch (e) {
    await saveMeta(meta).catch(() => undefined);
    const offline = isOffline(e);
    if (!offline) console.warn('[sync] Error:', e);
    status.set({ phase: offline ? 'offline' : 'error', pending: await pendingChanges() });
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => requestSync({ pull: true }), OFFLINE_RETRY_MS);
  }
}

export function requestSync(opts: { pull: boolean }): Promise<void> {
  const uid = currentUid();
  if (!uid) return Promise.resolve();
  if (running) {
    again = { pull: (again?.pull ?? false) || opts.pull };
    return running;
  }
  running = (async () => {
    try {
      let next: { pull: boolean } | null = opts;
      while (next) {
        again = null;
        const who = currentUid();
        if (!who) break;
        await syncOnce(who, next);
        next = again;
      }
    } catch (e) {
      console.warn('[sync] Error inesperado:', e);
    } finally {
      running = null;
    }
  })();
  return running;
}

export function syncNow(): Promise<void> {
  return requestSync({ pull: true });
}

let started = false;

export function startSync(): void {
  if (started) return;
  started = true;
  ensureFirebase();

  onAuthStateChanged(getAuth(), (user) => {
    if (user) {
      void syncNow();
    } else {
      if (retryTimer) clearTimeout(retryTimer);
      useSyncStatus.getState().set({ phase: 'idle', pending: 0, lastSyncAt: null });
    }
  });

  let lastForeground = 0;
  AppState.addEventListener('change', (next) => {
    if (next !== 'active' || Date.now() - lastForeground < FOREGROUND_MIN_INTERVAL_MS) return;
    lastForeground = Date.now();
    void syncNow();
  });

  let debounce: ReturnType<typeof setTimeout> | null = null;
  onLocalChange(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void requestSync({ pull: false }), LOCAL_CHANGE_DEBOUNCE_MS);
  });
}

export async function deleteAccountAndCloudData(): Promise<void> {
  if (running) await running.catch(() => undefined);
  await deleteAccount(async (uid) => {
    await withTimeout(deleteAllUserData(uid));
  });
  await clearMeta();
  useSyncStatus.getState().set({ phase: 'idle', pending: 0, lastSyncAt: null });
}

export async function signOutKeepingLocalData(): Promise<void> {
  if (running) await running.catch(() => undefined);
  await signOut();
  await clearMeta();
  useSyncStatus.getState().set({ phase: 'idle', pending: 0, lastSyncAt: null });
}

export async function signOutAndWipeLocalData(): Promise<void> {
  if (running) await running.catch(() => undefined);
  await signOut();
  await wipeLocalData();
  await clearMeta();
  useSyncStatus.getState().set({ phase: 'idle', pending: 0, lastSyncAt: null });
  await Promise.all([
    useDayItemsStore.getState().reload(),
    useInboxStore.getState().reload(),
    useCategoriesStore.getState().load(),
  ]);
  await refreshWidgets().catch(() => undefined);
  await refreshAppBadge().catch(() => undefined);
}
