/**
 * Motor de respaldo (SYNC_ROADMAP.md, Fase 3). SQLite sigue siendo la fuente de verdad: acá solo
 * se copia a/desde `users/{uid}` en segundo plano. Ninguna pantalla espera.
 *
 * Una corrida a la vez: traer → unir (`pickWinner`) → subir. Traer primero evita que la primera
 * subida pise con datos locales viejos algo más nuevo de la nube.
 *
 * Disparadores: sesión iniciada (al abrir la app o al entrar), volver a primer plano, y cambios
 * locales (solo subir, con espera de 3 s para agrupar — ver `onLocalChange`).
 */
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

/** Sin red no se espera más de esto por corrida (ver `net.ts`). */
const OFFLINE_RETRY_MS = 60000;
const LOCAL_CHANGE_DEBOUNCE_MS = 3000;
/** Volver a primer plano no trae más de una vez por este intervalo (lecturas = cuota). */
const FOREGROUND_MIN_INTERVAL_MS = 30000;

/** Respaldo en la nube es de Pro (SYNC_ROADMAP.md, Fase 5: sin RevenueCat todavía, usa el flag
 * local — ver `settingsStore.plan`, que incluye la prueba simulada). Solo gatea la SUBIDA: traer
 * corre siempre (así alguien que tuvo Pro y lo perdió no pierde lo que ya había respaldado). */
function hasBackupPlan(): boolean {
  return useSettingsStore.getState().plan === 'pro';
}

// ─── Traer y unir ────────────────────────────────────────────────────────────

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
  // Un hábito/task que repite recalcula su progreso/racha a partir de `habit_completions`/
  // `task_completions`, así que un cambio ahí también necesita refrescar Today aunque
  // `items.changed` sea falso.
  if (items.changed || cats.changed) {
    await refreshWidgets().catch(() => undefined);
  }
  if (items.changed) await useDayItemsStore.getState().reload();
  if (cats.changed) await useCategoriesStore.getState().load();
  return meta;
}

// ─── Subir ───────────────────────────────────────────────────────────────────

// Fase 4: `listPendingSync()` de las 4 tablas trae TODO lo pendiente, personal y de espacios
// mezclado (ver `PendingDayItem.spaceId`/`PendingCompletion.spaceId`/`PendingCategory.spaceId`).
// Acá solo sube lo personal (`spaceId == null`) a `users/{uid}/...`; `pushSpaces()` más abajo
// agrupa y sube lo demás a `spaces/{spaceId}/...` en su lugar.

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

// ─── Espacios compartidos — traer y subir (SYNC_ROADMAP.md, Fase 4) ───────────────

/** Mi rol en un espacio — `editorUids` ausente = legado, todos editores (mismo fallback que
 * `firestore.rules` → `isEditor()`). */
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

/**
 * Descubre los espacios de los que soy miembro, desliga los que ya no (salí/me sacaron/se
 * eliminó — "quien pierde el acceso conserva la categoría como propia", ver
 * `categoryRepository.unlinkSpace`) y trae config + ítems + completados de los que siguen vivos.
 * A diferencia de `pull()` (personal), no sube nada — eso es `pushSpaces()`, llamado aparte y sin
 * el gate de plan Pro (T9: solo el dueño necesita Pro, un invitado Free participa igual).
 */
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

    // Caché local de nombres (Fase 4 — indicador "quién completó esto", ver `schema.ts` →
    // `spaceMembers`): se resuelve en `DayItemRow` sin pegarle a la red por cada fila.
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

/** Resuelve `completedByUid`/`byUid` al momento de subir (Fase 4 — indicador "quién completó
 * esto"): si ya hay un valor local, lo conserva tal cual (ya quedó "fijo" la primera vez que se
 * subió, o llegó de un pull de otra persona); si todavía es `null` y la fila está completada
 * (`isDone`), lo estampa con `currentUid()` y lo persiste localmente ANTES de construir el
 * documento (vía `persist`, ver `dayItemRepository.setCompletedByUid`) — así una futura edición
 * de OTRA persona nunca lo pisa. `isDone=false` siempre devuelve `null` sin tocar nada. */
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

/** Sube lo pendiente de cada espacio (items/habitCompletions/taskCompletions a
 * `spaces/{spaceId}/...`, la categoría a `config/category` en vez de `users/{uid}/categories`).
 * Nunca gateado por plan (T9) — a diferencia de `push()`, que sí lo está. Si algo pendiente es de
 * un lector (sin gating de UI todavía, ver roadmap), `firestore.rules` lo rechaza y queda
 * `pending` para reintentar, como cualquier otro error. */
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

  // Categoría ligada a un espacio: config/category, no `users/{uid}/categories`. Un tombstone acá
  // no debería pasar en flujo normal (desligar usa `unlinkSpace`, no `remove()`, ver roadmap) —
  // si pasa igual, no hay nada que tombstonear en `config/category` (no tiene ese concepto), así
  // que solo se marca subida para no reintentarlo en vano.
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

// ─── Compartir una categoría (SYNC_ROADMAP.md, Fase 4) ───────────────────────────

/** Vence a los 7 días (ver "Reglas de seguridad" del roadmap) — `firestore.rules` solo exige
 * `<= 8 días`, se deja un día de margen. */
const INVITE_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Convierte una categoría personal en un espacio compartido del que soy dueño: crea `spaces/{id}`
 * (mismo `id` que la categoría — ver el comentario largo en `data/local/schema.ts` →
 * `categories.spaceId`) + `config/category`, liga la categoría local, migra sus ítems/completados
 * existentes (`dayItemRepository.migrateCategoryToSpace` + el mismo método en
 * `habitCompletionSyncRepository`/`taskCompletionSyncRepository`) y tombstona en
 * `users/{uid}/...` lo que ya se había subido ahí (de ahora en más esa categoría y su contenido
 * viven solo en `spaces/{id}/...`). Lanza si no hay sesión, si la categoría no existe o si ya
 * está compartida (la UI no debería dejar llegar hasta acá en esos casos, pero el motor no confía
 * ciegamente en quien llama).
 */
export async function shareCategory(categoryId: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error('shareCategory: sin sesión');
  const cat = (await categoryRepository.list()).find((c) => c.id === categoryId);
  if (!cat) throw new Error('shareCategory: categoría no encontrada');
  if (cat.space) throw new Error('shareCategory: ya está compartida');

  const now = new Date().toISOString();
  // Esta categoría pudo haber sido un espacio antes (se compartió, se eliminó, y ahora se
  // comparte de nuevo — mismo `spaceId` siempre, ver el comentario largo en `schema.ts` →
  // `categories.spaceId`): el documento viejo sigue existiendo en Firestore, solo marcado
  // `deletedAt` (nunca se borra de verdad), así que hay que REVIVIRLO en vez de crear uno nuevo
  // encima (ver el comentario de `reviveSpaceDoc` — un `setDoc` ahí fallaría contra las reglas).
  const existing = await withTimeout(getSpaceDoc(categoryId)).catch(() => null);
  if (existing && existing.ownerUid === uid) {
    await withTimeout(reviveSpaceDoc(categoryId, uid));
  } else {
    await withTimeout(createSpaceDoc(categoryId, { ownerUid: uid, memberUids: [uid], editorUids: [uid], createdAt: now, deletedAt: null }));
  }
  await withTimeout(setSpaceConfig(categoryId, { label: cat.label, icon: cat.icon, color: cat.color, updatedAt: now }));
  // Bug real encontrado probando con dos cuentas reales: sin esto, el dueño nunca tenía su
  // propia fila en members/{uid} (solo joinCategoryWithCode la creaba, para quien se UNE) — la
  // lista de miembros mostraba su uid crudo en vez de su nombre.
  const displayName = getAuth().currentUser?.displayName ?? '';
  await withTimeout(setSpaceMember(categoryId, uid, { name: displayName, joinedAt: now, updatedAt: now })).catch(() => undefined);
  // Si esta categoría ya se había subido como personal antes de compartirla, esa fila queda
  // huérfana (de ahora en más vive en spaces/{id}/config/category, no en users/{uid}/categories).
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

/** Genera un código de invitación para un espacio del que ya soy miembro (compartir de nuevo, o
 * invitar a más gente). Reintenta con otro código al azar si el generado ya existe (colisión
 * rarísima, 32⁶ combinaciones — ver `domain/inviteCode.ts`). */
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

// ─── Unirme con un código (SYNC_ROADMAP.md, Fase 4) ──────────────────────────────

/** Motivo por el que `joinCategoryWithCode` no pudo unirse — la UI elige el mensaje (vía `t()`,
 * ver `ShareCategorySheet.tsx` para el patrón equivalente del lado de compartir). `denied` es el
 * fallback de cualquier motivo que solo el servidor puede rechazar: ya soy miembro, el espacio ya
 * llegó al límite (T10), o se eliminó — `spaces/{id}` no se puede leer de antemano para
 * distinguirlos acá (`allow get` exige ya ser miembro, ver el comentario de `joinSpace` en
 * `remote.ts`), así que todos caen en el mismo mensaje genérico. */
export type JoinCodeErrorKind = 'no-session' | 'invalid-code' | 'expired-code' | 'free-limit' | 'denied';

export class JoinCodeError extends Error {
  constructor(readonly kind: JoinCodeErrorKind) {
    super(`joinCategoryWithCode:${kind}`);
  }
}

/** Cuántas categorías tengo como INVITADO (compartidas por otra persona, no las que yo comparto)
 * — T10: un Free puede estar en como máximo 2 así. Sin Cloud Functions no hay forma de que el
 * servidor lo haga cumplir (ver el comentario de T10 en el roadmap); esto es solo el chequeo de
 * la app, antes de intentar unirse. */
const FREE_INVITEE_LIMIT = 2;

async function invitedCategoryCount(uid: string): Promise<number> {
  const linked = await categoryRepository.listSpaceLinked();
  return linked.filter((c) => c.space!.ownerUid !== uid).length;
}

/**
 * Me uno a una categoría compartida con un código (T9: un invitado Free participa igual, no
 * necesita Pro — solo quien la compartió lo necesitaba). Valida lo que se puede localmente ANTES
 * de tocar Firestore (sesión, código vigente, límite T10) para dar un mensaje preciso; el resto —
 * ya soy miembro, el espacio ya llegó al límite de miembros, o se eliminó — solo lo sabe el
 * servidor al intentar el `update` (ver el comentario de `joinSpace` en `remote.ts`: no se puede
 * leer `spaces/{id}` de antemano sin ya ser miembro), así que cae en `denied`. Al unirme con
 * éxito, pido una traída (`requestSync({ pull: true })`): el próximo ciclo de `pullSpaces`
 * descubre el espacio nuevo y crea la categoría local sola, mismo camino ya probado para
 * cualquier espacio del que soy miembro.
 */
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

// ─── Gestión de miembros (SYNC_ROADMAP.md, Fase 4) ───────────────────────────────

export interface SpaceMemberInfo {
  uid: string;
  name: string;
  role: SpaceRole;
  isOwner: boolean;
}

/** Crea/actualiza MI PROPIA fila en `members/{uid}` si falta (autocura un espacio compartido
 * antes de que `shareCategory` empezara a crearla para el dueño — ver su comentario). Solo
 * puedo escribir la mía (`firestore.rules`: `allow create: if canWrite(id) && uid ==
 * request.auth.uid`), así que esto únicamente arregla mi propia fila, nunca la de otro miembro
 * viejo sin nombre — cada quien la autocura al abrir `ShareCategorySheet`. */
export async function ensureMyMemberRow(spaceId: string): Promise<void> {
  const uid = currentUid();
  if (!uid) return;
  const now = new Date().toISOString();
  const displayName = getAuth().currentUser?.displayName ?? '';
  await withTimeout(setSpaceMember(spaceId, uid, { name: displayName, joinedAt: now, updatedAt: now })).catch(() => undefined);
}

/** Miembros de un espacio con su nombre (`members/{uid}`) y rol (`editorUids`/`memberUids` del
 * espacio mismo — `members/{uid}` no guarda el rol, ver `mappers.ts` → `SpaceMemberDoc`). Un
 * nombre vacío (cuenta que nunca puso `displayName`, o se unió antes de que
 * `joinCategoryWithCode` empezara a guardarlo) cae al propio `uid` — mejor que una fila en
 * blanco. */
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

/** El dueño cambia el rol de alguien (T11) — lee el espacio primero (quien llama ya es miembro,
 * a diferencia de `joinCategoryWithCode`, ver el comentario de `getSpaceDoc`) para reconstruir
 * `editorUids` entero; el dueño siempre queda adentro, nunca se autodegrada por accidente. */
export async function changeMemberRole(spaceId: string, memberUid: string, role: SpaceRole): Promise<void> {
  const space = await withTimeout(getSpaceDoc(spaceId));
  if (!space) throw new Error('changeMemberRole: espacio no encontrado');
  const next = new Set(space.editorUids ?? space.memberUids);
  if (role === 'editor') next.add(memberUid);
  else next.delete(memberUid);
  next.add(space.ownerUid);
  await withTimeout(setSpaceEditorUids(spaceId, Array.from(next)));
}

/** El dueño quita a alguien más del espacio. Nada que hacer localmente acá (a diferencia de
 * `leaveCategorySpace`/`deleteCategorySpace`): el afectado se desvincula solo en SU propio
 * próximo `pullSpaces` — `discoverSpaces(suUid)` ya no va a traer este espacio en absoluto en
 * cuanto deje de estar en `memberUids`. */
export async function removeMemberFromCategory(spaceId: string, memberUid: string): Promise<void> {
  await withTimeout(removeSpaceMember(spaceId, memberUid));
}

/** Desliga localmente una categoría de su espacio ya eliminado/abandonado — mismo trío de
 * llamadas que ya hace `pullSpaces` al descubrir que un espacio dejó de estar vivo, factorizado
 * acá para que `leaveCategorySpace`/`deleteCategorySpace` no esperen al próximo ciclo de sync
 * para que la UI se entere (se llama justo después de la escritura remota, no en su lugar). */
async function unlinkSpaceLocally(spaceId: string): Promise<void> {
  await categoryRepository.unlinkSpace(spaceId);
  await dayItemRepository.unlinkSpace(spaceId);
  await habitCompletionSyncRepository.unlinkSpace(spaceId);
  await taskCompletionSyncRepository.unlinkSpace(spaceId);
  const meta = await loadMeta();
  await saveMeta(forgetSpace(meta, spaceId));
  await useCategoriesStore.getState().load();
}

/** Un miembro (no el dueño) sale por su cuenta — "quien pierde el acceso conserva la categoría
 * como propia" (ver roadmap): queda personal y pending para resubir, en vez de desaparecer. */
export async function leaveCategorySpace(spaceId: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error('leaveCategorySpace: sin sesión');
  await withTimeout(leaveSpace(spaceId, uid));
  await unlinkSpaceLocally(spaceId);
}

/** El dueño elimina el espacio entero (`deletedAt`, nunca un delete real — ver el comentario de
 * `remote.ts` → `deleteSpace`). El dueño también pierde el vínculo localmente (mismo trato que
 * cualquier otro miembro); los demás se enteran en su propio próximo `pullSpaces`. */
export async function deleteCategorySpace(spaceId: string): Promise<void> {
  await withTimeout(deleteSpace(spaceId));
  await unlinkSpaceLocally(spaceId);
}

// ─── Ajustes visuales — un solo documento, LWW (SYNC_ROADMAP.md, Fase 3) ──────────

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

/** Trae y, si corresponde, sube — ver el mismo patrón en `pickWinner`. Sin lista de pendientes
 * (es un solo documento): basta comparar `updatedAt` cada corrida, es barato (1 lectura). Si gana
 * lo local pero nunca se tocó en este teléfono (`settingsUpdatedAt` null = los defaults de
 * `settingsStore.ts`), no sube nada — evita pisar un respaldo real con un doc vacío recién
 * instalado. */
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

// ─── Pendientes (para Ajustes → Cuenta) ──────────────────────────────────────

export async function pendingChanges(): Promise<number> {
  const [items, habits, tasks, cats] = await Promise.all([
    dayItemRepository.listPendingSync(),
    habitCompletionSyncRepository.listPendingSync(),
    taskCompletionSyncRepository.listPendingSync(),
    categoryRepository.listPendingSync(),
  ]);
  return items.length + habits.length + tasks.length + cats.length;
}

// ─── Orquestación ────────────────────────────────────────────────────────────

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
    // Sin gate de plan (T9): un invitado Free sigue participando de un espacio aunque no tenga
    // Pro — solo el dueño necesitaba Pro para compartirlo.
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

/** Pide una corrida; si ya hay una, se repite al terminar (con traída si alguna la pidió). */
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
      // `syncOnce` ya captura todo lo suyo internamente — este catch es solo una red de
      // seguridad para que un error inesperado (p. ej. agregado por un cambio futuro fuera del
      // try/catch de `syncOnce`) nunca deje `running` como una promesa rechazada sin manejar:
      // `startSync()` la dispara con `void syncNow()`, que la ignoraría en silencio.
      console.warn('[sync] Error inesperado:', e);
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Traer y subir ya (iniciar sesión, deslizar en Ajustes → Cuenta). */
export function syncNow(): Promise<void> {
  return requestSync({ pull: true });
}

let started = false;

/** Una vez, al arrancar la app (tras el bootstrap). Sin sesión no hace nada hasta que la haya. */
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

// ─── Cuenta: eliminar cuenta ──────────────────────────────────────────────────

/**
 * Eliminar cuenta (Google Play lo exige ofrecerlo): borra todo lo de la nube mientras la sesión
 * sigue siendo válida, después la cuenta. Los datos del teléfono se quedan intactos (quedan
 * "pendientes" de nuevo si más adelante se vuelve a iniciar sesión con otra cuenta Pro).
 */
export async function deleteAccountAndCloudData(): Promise<void> {
  if (running) await running.catch(() => undefined);
  await deleteAccount(async (uid) => {
    await withTimeout(deleteAllUserData(uid));
  });
  await clearMeta();
  useSyncStatus.getState().set({ phase: 'idle', pending: 0, lastSyncAt: null });
}

// ─── Cuenta: cerrar sesión ──────────────────────────────────────────────────

/**
 * Cerrar sesión dejando los datos del teléfono tal cual (SYNC_ROADMAP.md, T8 — "Mantener"). El
 * respaldo en la nube sigue ahí; si se vuelve a iniciar sesión con la misma cuenta, `pull` lo trae
 * de nuevo. No bloquea aunque haya cambios sin subir — "Mantener" nunca pierde nada.
 */
export async function signOutKeepingLocalData(): Promise<void> {
  if (running) await running.catch(() => undefined);
  await signOut();
  await clearMeta();
  useSyncStatus.getState().set({ phase: 'idle', pending: 0, lastSyncAt: null });
}

/**
 * Cerrar sesión Y borrar los datos de este teléfono (SYNC_ROADMAP.md, T8 — "Borrar"). El caller
 * (Ajustes) ya confirmó con el usuario y ya verificó `pendingChanges() === 0` antes de ofrecer
 * esta opción — acá no se vuelve a chequear porque entre ambos pasos no hay forma de que algo
 * nuevo quede pendiente (ningún otro flujo escribe en SQLite durante un modal de confirmación).
 * El respaldo en la nube NO se toca (a diferencia de `deleteAccountAndCloudData`): sigue
 * disponible si el usuario vuelve a iniciar sesión más adelante, en este teléfono o en otro.
 */
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
