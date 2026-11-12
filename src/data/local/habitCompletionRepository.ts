import { eq, and, or, isNull, inArray } from 'drizzle-orm';
import { db } from './db';
import { habitCompletions } from './schema';
import { emitLocalChange } from './localChanges';
import type { SyncVersion } from './dayItemRepository';

/** `updated_at` nulo en `habit_completions`/`task_completions` = fila de antes de la Fase 1
 * (columna agregada por `ALTER TABLE`, sin backfill — ver `db.ts`). Se trata como "lo más viejo
 * posible": nunca le gana a nada remoto con fecha real, pero tampoco rompe `pickWinner` (que
 * exige un ISO parseable). */
export const EPOCH = '1970-01-01T00:00:00.000Z';

/** Pendientes de `habit_completions`/`task_completions` (misma forma para ambas tablas). */
export interface PendingCompletion {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
  habitId?: string;
  taskId?: string;
  date: string;
  /** Fase 4 — mismo criterio que `PendingDayItem.spaceId`: `null` = `users/{uid}/habitCompletions`
   * (o `taskCompletions`) personal; si no, `spaces/{spaceId}/...` en vez de ahí. */
  spaceId: string | null;
  /** Fase 4 — mismo criterio que `PendingDayItem.completedByUid`: quién completó esta fecha. */
  completedByUid: string | null;
}

export const habitCompletionSyncRepository = {
  // `sync_state IS NULL` = fila de antes de la Fase 1 — tratarla como pendiente también, o nunca
  // sube.
  async listPendingSync(): Promise<PendingCompletion[]> {
    const rows = await db
      .select()
      .from(habitCompletions)
      .where(or(eq(habitCompletions.syncState, 'pending'), isNull(habitCompletions.syncState)));
    return rows.map((r) => ({
      id: r.id,
      updatedAt: r.updatedAt ?? EPOCH,
      deletedAt: r.deletedAt,
      habitId: r.habitId,
      date: r.date,
      spaceId: r.spaceId,
      completedByUid: r.completedByUid,
    }));
  },
  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(habitCompletions).set({ syncState: 'synced' }).where(inArray(habitCompletions.id, ids));
  },
  /** Mismo criterio que `dayItemRepository.setCompletedByUid`. */
  async setCompletedByUid(id: string, uid: string): Promise<void> {
    await db.update(habitCompletions).set({ completedByUid: uid }).where(eq(habitCompletions.id, id));
  },
  /** `habitId -> completedByUid` de todo lo marcado hecho en `date` — mismo criterio que
   * `dayItemRepository.getCompletedByUidMap`, una sola query para `dayItemsStore.reload()`. */
  async getCompletedByUidMap(date: string): Promise<Record<string, string | null>> {
    const rows = await db
      .select({ habitId: habitCompletions.habitId, completedByUid: habitCompletions.completedByUid })
      .from(habitCompletions)
      .where(and(eq(habitCompletions.date, date), isNull(habitCompletions.deletedAt)));
    const map: Record<string, string | null> = {};
    for (const r of rows) map[r.habitId] = r.completedByUid;
    return map;
  },
  async getSyncVersion(id: string): Promise<SyncVersion | null> {
    const rows = await db
      .select({ updatedAt: habitCompletions.updatedAt, deletedAt: habitCompletions.deletedAt })
      .from(habitCompletions)
      .where(eq(habitCompletions.id, id))
      .limit(1);
    return rows[0] ? { updatedAt: rows[0].updatedAt ?? EPOCH, deletedAt: rows[0].deletedAt } : null;
  },
  // Conflicto por `(habit_id, date)` (el índice único real), no por `id`: `id` es solo una
  // caché derivada de ese par (ver el comentario de la columna en `schema.ts`), y una fila vieja
  // con un `id` distinto para el MISMO par (datos de antes de esa convención, o — bug real visto
  // en dispositivo al probar T8 — un re-seed con un esquema de id distinto) tiraba abajo el pull
  // entero con "UNIQUE constraint failed" en vez de simplemente fusionarse con la fila local.
  // `spaceId: null` explícito en el `set` del conflicto, no solo en el insert: corrige una fila
  // vieja que haya quedado con el espacio equivocado (no debería pasar, pero este `apply` es del
  // respaldo PERSONAL — si algo la trae por acá, es porque es personal de verdad).
  async applyRemoteUpsert(id: string, habitId: string, date: string, updatedAt: string): Promise<void> {
    await db
      .insert(habitCompletions)
      .values({ id, habitId, date, updatedAt, deletedAt: null, syncState: 'synced', spaceId: null })
      .onConflictDoUpdate({
        target: [habitCompletions.habitId, habitCompletions.date],
        set: { updatedAt, deletedAt: null, syncState: 'synced', spaceId: null },
      });
  },
  /** Lo mismo que `applyRemoteUpsert`, para un completado bajado de `spaces/{spaceId}/
   * habitCompletions` (Fase 4) — hace falta su propio `apply` (no basta pasar `spaceId` como
   * parámetro extra del de arriba) porque CORRIGE el `space_id` local en el `set` del conflicto,
   * algo que el personal explícitamente NO debe hacer (si una fila ya existe ahí como personal, no
   * hay que empezar a tratarla como de un espacio solo porque también llegó por ese camino). */
  async applySpaceRemoteUpsert(
    id: string,
    habitId: string,
    date: string,
    updatedAt: string,
    spaceId: string,
    completedByUid: string | null = null,
  ): Promise<void> {
    await db
      .insert(habitCompletions)
      .values({ id, habitId, date, updatedAt, deletedAt: null, syncState: 'synced', spaceId, completedByUid })
      .onConflictDoUpdate({
        target: [habitCompletions.habitId, habitCompletions.date],
        set: { updatedAt, deletedAt: null, syncState: 'synced', spaceId, completedByUid },
      });
  },
  async applyRemoteDelete(id: string, habitId: string, date: string, deletedAt: string): Promise<void> {
    await db
      .insert(habitCompletions)
      .values({ id, habitId, date, updatedAt: deletedAt, deletedAt, syncState: 'synced' })
      .onConflictDoUpdate({
        target: [habitCompletions.habitId, habitCompletions.date],
        set: { updatedAt: deletedAt, deletedAt, syncState: 'synced' },
      });
  },
  /** Mismo criterio que `dayItemRepository.unlinkSpace`. */
  async unlinkSpace(spaceId: string): Promise<void> {
    await db
      .update(habitCompletions)
      .set({ spaceId: null, updatedAt: new Date().toISOString(), syncState: 'pending' })
      .where(eq(habitCompletions.spaceId, spaceId));
    emitLocalChange();
  },

  /** Mismo criterio que `dayItemRepository.migrateCategoryToSpace`, para los completados de los
   * hábitos que esa migración encontró en la categoría (su `habitIds`). */
  async migrateForHabits(habitIds: string[], spaceId: string): Promise<string[]> {
    if (habitIds.length === 0) return [];
    const rows = await db.select({ id: habitCompletions.id }).from(habitCompletions).where(inArray(habitCompletions.habitId, habitIds));
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      await db
        .update(habitCompletions)
        .set({ spaceId, updatedAt: new Date().toISOString(), syncState: 'pending' })
        .where(inArray(habitCompletions.id, ids));
      emitLocalChange();
    }
    return ids;
  },
};
