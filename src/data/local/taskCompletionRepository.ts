import { eq, and, or, isNull, inArray } from 'drizzle-orm';
import { db } from './db';
import { taskCompletions } from './schema';
import { emitLocalChange } from './localChanges';
import type { SyncVersion } from './dayItemRepository';
import { EPOCH, type PendingCompletion } from './habitCompletionRepository';

export const taskCompletionSyncRepository = {
  async listPendingSync(): Promise<PendingCompletion[]> {
    const rows = await db
      .select()
      .from(taskCompletions)
      .where(or(eq(taskCompletions.syncState, 'pending'), isNull(taskCompletions.syncState)));
    return rows.map((r) => ({
      id: r.id,
      updatedAt: r.updatedAt ?? EPOCH,
      deletedAt: r.deletedAt,
      taskId: r.taskId,
      date: r.date,
      spaceId: r.spaceId,
      completedByUid: r.completedByUid,
    }));
  },
  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(taskCompletions).set({ syncState: 'synced' }).where(inArray(taskCompletions.id, ids));
  },
  async setCompletedByUid(id: string, uid: string): Promise<void> {
    await db.update(taskCompletions).set({ completedByUid: uid }).where(eq(taskCompletions.id, id));
  },
  async getCompletedByUidMap(date: string): Promise<Record<string, string | null>> {
    const rows = await db
      .select({ taskId: taskCompletions.taskId, completedByUid: taskCompletions.completedByUid })
      .from(taskCompletions)
      .where(and(eq(taskCompletions.date, date), isNull(taskCompletions.deletedAt)));
    const map: Record<string, string | null> = {};
    for (const r of rows) map[r.taskId] = r.completedByUid;
    return map;
  },
  async getSyncVersion(id: string): Promise<SyncVersion | null> {
    const rows = await db
      .select({ updatedAt: taskCompletions.updatedAt, deletedAt: taskCompletions.deletedAt })
      .from(taskCompletions)
      .where(eq(taskCompletions.id, id))
      .limit(1);
    return rows[0] ? { updatedAt: rows[0].updatedAt ?? EPOCH, deletedAt: rows[0].deletedAt } : null;
  },
  async applyRemoteUpsert(id: string, taskId: string, date: string, updatedAt: string): Promise<void> {
    await db
      .insert(taskCompletions)
      .values({ id, taskId, date, updatedAt, deletedAt: null, syncState: 'synced', spaceId: null })
      .onConflictDoUpdate({
        target: [taskCompletions.taskId, taskCompletions.date],
        set: { updatedAt, deletedAt: null, syncState: 'synced', spaceId: null },
      });
  },
  async applySpaceRemoteUpsert(
    id: string,
    taskId: string,
    date: string,
    updatedAt: string,
    spaceId: string,
    completedByUid: string | null = null,
  ): Promise<void> {
    await db
      .insert(taskCompletions)
      .values({ id, taskId, date, updatedAt, deletedAt: null, syncState: 'synced', spaceId, completedByUid })
      .onConflictDoUpdate({
        target: [taskCompletions.taskId, taskCompletions.date],
        set: { updatedAt, deletedAt: null, syncState: 'synced', spaceId, completedByUid },
      });
  },
  async applyRemoteDelete(id: string, taskId: string, date: string, deletedAt: string): Promise<void> {
    await db
      .insert(taskCompletions)
      .values({ id, taskId, date, updatedAt: deletedAt, deletedAt, syncState: 'synced' })
      .onConflictDoUpdate({
        target: [taskCompletions.taskId, taskCompletions.date],
        set: { updatedAt: deletedAt, deletedAt, syncState: 'synced' },
      });
  },
  async unlinkSpace(spaceId: string): Promise<void> {
    await db
      .update(taskCompletions)
      .set({ spaceId: null, updatedAt: new Date().toISOString(), syncState: 'pending' })
      .where(eq(taskCompletions.spaceId, spaceId));
    emitLocalChange();
  },

  async migrateForTasks(taskIds: string[], spaceId: string): Promise<string[]> {
    if (taskIds.length === 0) return [];
    const rows = await db.select({ id: taskCompletions.id }).from(taskCompletions).where(inArray(taskCompletions.taskId, taskIds));
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      await db
        .update(taskCompletions)
        .set({ spaceId, updatedAt: new Date().toISOString(), syncState: 'pending' })
        .where(inArray(taskCompletions.id, ids));
      emitLocalChange();
    }
    return ids;
  },
};
