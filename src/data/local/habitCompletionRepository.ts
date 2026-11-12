import { eq, and, or, isNull, inArray } from 'drizzle-orm';
import { db } from './db';
import { habitCompletions } from './schema';
import { emitLocalChange } from './localChanges';
import type { SyncVersion } from './dayItemRepository';

export const EPOCH = '1970-01-01T00:00:00.000Z';

export interface PendingCompletion {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
  habitId?: string;
  taskId?: string;
  date: string;
  spaceId: string | null;
  completedByUid: string | null;
}

export const habitCompletionSyncRepository = {
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
  async setCompletedByUid(id: string, uid: string): Promise<void> {
    await db.update(habitCompletions).set({ completedByUid: uid }).where(eq(habitCompletions.id, id));
  },
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
  // ver docs/adr/0007-conflicto-por-habit-date-no-id.md
  async applyRemoteUpsert(id: string, habitId: string, date: string, updatedAt: string): Promise<void> {
    await db
      .insert(habitCompletions)
      .values({ id, habitId, date, updatedAt, deletedAt: null, syncState: 'synced', spaceId: null })
      .onConflictDoUpdate({
        target: [habitCompletions.habitId, habitCompletions.date],
        set: { updatedAt, deletedAt: null, syncState: 'synced', spaceId: null },
      });
  },
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
  async unlinkSpace(spaceId: string): Promise<void> {
    await db
      .update(habitCompletions)
      .set({ spaceId: null, updatedAt: new Date().toISOString(), syncState: 'pending' })
      .where(eq(habitCompletions.spaceId, spaceId));
    emitLocalChange();
  },

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
