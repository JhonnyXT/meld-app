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
import {
  dayItemRepository,
  habitCompletionSyncRepository,
  taskCompletionSyncRepository,
} from '@/data/local/dayItemRepository';
import { onLocalChange } from '@/data/local/localChanges';
import { wipeLocalData } from '@/data/local/wipeLocalData';
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
  docToCategory,
  docToDayItem,
  habitCompletionToDoc,
  taskCompletionToDoc,
  tombstoneDoc,
  type CategoryDoc,
  type DayItemDoc,
  type HabitCompletionDoc,
  type TaskCompletionDoc,
} from './mappers';
import { advanceCursor, type SyncMeta } from './meta';
import { clearMeta, loadMeta, saveMeta } from './metaStore';
import { deleteAllUserData, pullCollection, pushBatch, type PushOp } from './remote';
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

async function pushItems(uid: string): Promise<void> {
  const pending = await dayItemRepository.listPendingSync();
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
  const pending = await habitCompletionSyncRepository.listPendingSync();
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
  const pending = await taskCompletionSyncRepository.listPendingSync();
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
  const pending = await categoryRepository.listPendingSync();
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
    if (opts.pull) meta = await pull(uid, meta);
    if (canBackup) await push(uid);
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
