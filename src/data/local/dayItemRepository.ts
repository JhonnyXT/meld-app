import { eq, and, ne, lt, isNull, isNotNull, gte, lte, like, asc, inArray, sql } from 'drizzle-orm';
import { db } from './db';
import { dayItems, habitCompletions, taskCompletions, categories } from './schema';
import { emitLocalChange } from './localChanges';
import type { DayItem, DayItemStatus } from '@/domain/dayItem';

export interface SyncVersion {
  updatedAt: string;
  deletedAt: string | null;
}

export interface PendingDayItem {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
  categoryId: string | null;
  spaceId: string | null;
  completedByUid: string | null;
  item: DayItem | null;
}

type Row = typeof dayItems.$inferSelect;
type NewRow = typeof dayItems.$inferInsert;

const notDeleted = isNull(dayItems.deletedAt);

function toDomain(row: Row): DayItem {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    date: row.date,
    title: row.title,
    category: row.category,
    categoryColor: row.categoryColor,
    reminderAt: row.reminderAt,
    status: row.status,
    type: row.type,
    priority: row.priority,
    repeatRule: row.repeatRule,
    link: row.link,
    startTime: row.startTime ?? undefined,
    endTime: row.endTime ?? undefined,
    calendarSource: row.calendarSource,
    endDate: row.endDate,
    targetFrequency: row.targetFrequency ?? undefined,
    currentStreak: row.currentStreak ?? undefined,
    progress: row.progress ?? undefined,
    autoTrack: row.autoTrack ?? undefined,
    healthMetric: row.healthMetric,
    healthMetricTarget: row.healthMetricTarget,
    colorStyle: row.colorStyle ?? undefined,
    richTextBody: row.richTextBody ?? undefined,
    audioFileUri: row.audioFileUri ?? undefined,
    durationSeconds: row.durationSeconds ?? undefined,
    mediaUri: row.mediaUri ?? undefined,
    weekOfYear: row.weekOfYear ?? undefined,
  } as DayItem;
}

async function getItemSpaceId(itemId: string): Promise<string | null> {
  const rows = await db.select({ spaceId: dayItems.spaceId }).from(dayItems).where(eq(dayItems.id, itemId)).limit(1);
  return rows[0]?.spaceId ?? null;
}

async function resolveCategoryId(label: string | null): Promise<string | null> {
  if (!label) return null;
  const rows = await db.select({ id: categories.id }).from(categories).where(eq(categories.label, label)).limit(1);
  return rows[0]?.id ?? null;
}

async function resolveSpaceId(categoryId: string | null): Promise<string | null> {
  if (!categoryId) return null;
  const rows = await db.select({ spaceId: categories.spaceId }).from(categories).where(eq(categories.id, categoryId)).limit(1);
  return rows[0]?.spaceId ?? null;
}

async function resolveCompletedByUid(id: string, nextStatus: DayItemStatus): Promise<string | null> {
  if (nextStatus !== 'done') return null;
  const rows = await db
    .select({ status: dayItems.status, completedByUid: dayItems.completedByUid })
    .from(dayItems)
    .where(eq(dayItems.id, id))
    .limit(1);
  const prev = rows[0];
  return prev && prev.status === 'done' ? prev.completedByUid : null;
}

function toRow(item: DayItem, categoryId: string | null, spaceId: string | null): NewRow {
  const base = {
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    date: item.date,
    title: item.title,
    category: item.category,
    categoryColor: item.categoryColor,
    reminderAt: item.reminderAt,
    status: item.status,
    type: item.type,
    priority: item.priority,
    categoryId,
    spaceId,
    deletedAt: null,
    syncState: 'pending' as const,
  };

  switch (item.type) {
    case 'task':
      return { ...base, repeatRule: item.repeatRule, link: item.link };
    case 'event':
      return {
        ...base,
        startTime: item.startTime,
        endTime: item.endTime,
        calendarSource: item.calendarSource,
        link: item.link,
        endDate: item.endDate,
      };
    case 'habit':
      return {
        ...base,
        targetFrequency: item.targetFrequency,
        currentStreak: item.currentStreak,
        progress: item.progress,
        autoTrack: item.autoTrack,
        healthMetric: item.healthMetric,
        healthMetricTarget: item.healthMetricTarget,
        colorStyle: item.colorStyle,
      };
    case 'note':
      return { ...base, richTextBody: item.richTextBody };
    case 'voiceMemo':
      return { ...base, audioFileUri: item.audioFileUri, durationSeconds: item.durationSeconds };
    case 'moment':
      return { ...base, mediaUri: item.mediaUri, weekOfYear: item.weekOfYear };
  }
}

export const dayItemRepository = {
  async listByDate(date: string): Promise<DayItem[]> {
    // ver docs/adr/0024-eventos-multi-dia.md
    const rows = await db
      .select()
      .from(dayItems)
      .where(
        and(
          lte(dayItems.date, date),
          sql`coalesce(${dayItems.endDate}, ${dayItems.date}) >= ${date}`,
          notDeleted,
        ),
      );
    return rows.map(toDomain);
  },

  async listOverdueTasks(beforeDateKey: string): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(
        and(
          eq(dayItems.type, 'task'),
          eq(dayItems.status, 'scheduled'),
          lt(dayItems.date, beforeDateKey),
          isNull(dayItems.repeatRule),
          notDeleted,
        ),
      );
    return rows.map(toDomain);
  },

  async listByDateRange(startKey: string, endKey: string): Promise<DayItem[]> {
    // ver docs/adr/0024-eventos-multi-dia.md
    const rows = await db
      .select()
      .from(dayItems)
      .where(
        and(
          lte(dayItems.date, endKey),
          sql`coalesce(${dayItems.endDate}, ${dayItems.date}) >= ${startKey}`,
          notDeleted,
        ),
      );
    return rows.map(toDomain);
  },

  async listInbox(): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(isNull(dayItems.date), eq(dayItems.status, 'inbox'), notDeleted));
    return rows.map(toDomain);
  },

  async searchByTitle(query: string): Promise<DayItem[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(like(dayItems.title, `%${trimmed}%`), notDeleted))
      .orderBy(asc(dayItems.date));
    return rows.map(toDomain);
  },

  async listUpcomingReminders(nowIso: string): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(isNotNull(dayItems.reminderAt), gte(dayItems.reminderAt, nowIso), notDeleted))
      .orderBy(asc(dayItems.reminderAt));
    return rows.map(toDomain);
  },

  async listDistinctHabitTitles(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ title: dayItems.title })
      .from(dayItems)
      .where(and(eq(dayItems.type, 'habit'), notDeleted))
      .orderBy(asc(dayItems.title));
    return rows.map((r) => r.title);
  },

  async getById(id: string): Promise<DayItem | null> {
    const rows = await db.select().from(dayItems).where(and(eq(dayItems.id, id), notDeleted)).limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  },

  async upsert(item: DayItem): Promise<void> {
    const categoryId = await resolveCategoryId(item.category);
    const spaceId = await resolveSpaceId(categoryId);
    const completedByUid = await resolveCompletedByUid(item.id, item.status);
    const row = { ...toRow(item, categoryId, spaceId), completedByUid };
    await db
      .insert(dayItems)
      .values(row)
      .onConflictDoUpdate({ target: dayItems.id, set: row });
    emitLocalChange();
  },

  async remove(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db
      .update(dayItems)
      .set({ deletedAt: now, updatedAt: now, syncState: 'pending' })
      .where(eq(dayItems.id, id));
    await db.delete(habitCompletions).where(eq(habitCompletions.habitId, id));
    await db.delete(taskCompletions).where(eq(taskCompletions.taskId, id));
    emitLocalChange();
  },

  async listActiveHabits(): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(eq(dayItems.type, 'habit'), ne(dayItems.status, 'inbox'), notDeleted));
    return rows.map(toDomain);
  },

  async toggleHabitCompletion(habitId: string, date: string): Promise<boolean> {
    const id = `${habitId}-${date}`;
    const now = new Date().toISOString();
    const existing = await db.select().from(habitCompletions).where(eq(habitCompletions.id, id)).limit(1);
    const isActive = existing.length > 0 && !existing[0].deletedAt;
    if (isActive) {
      await db
        .update(habitCompletions)
        .set({ deletedAt: now, updatedAt: now, syncState: 'pending', completedByUid: null })
        .where(eq(habitCompletions.id, id));
      emitLocalChange();
      return false;
    }
    if (existing.length > 0) {
      await db
        .update(habitCompletions)
        .set({ deletedAt: null, updatedAt: now, syncState: 'pending', completedByUid: null })
        .where(eq(habitCompletions.id, id));
    } else {
      const spaceId = await getItemSpaceId(habitId);
      await db.insert(habitCompletions).values({ id, habitId, date, updatedAt: now, syncState: 'pending', spaceId });
    }
    emitLocalChange();
    return true;
  },

  async listHabitCompletionDates(habitId: string, fromDate: string, toDate: string): Promise<string[]> {
    const rows = await db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.habitId, habitId),
          gte(habitCompletions.date, fromDate),
          lte(habitCompletions.date, toDate),
          isNull(habitCompletions.deletedAt),
        ),
      );
    return rows.map((r) => r.date);
  },

  async listAllHabitCompletionsInRange(
    fromDate: string,
    toDate: string,
  ): Promise<{ habitId: string; date: string }[]> {
    const rows = await db
      .select()
      .from(habitCompletions)
      .where(
        and(gte(habitCompletions.date, fromDate), lte(habitCompletions.date, toDate), isNull(habitCompletions.deletedAt)),
      );
    return rows.map((r) => ({ habitId: r.habitId, date: r.date }));
  },

  async listActiveRepeatingTasks(): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(eq(dayItems.type, 'task'), isNotNull(dayItems.repeatRule), ne(dayItems.status, 'inbox'), notDeleted));
    return rows.map(toDomain);
  },

  async toggleTaskCompletion(taskId: string, date: string): Promise<boolean> {
    const id = `${taskId}-${date}`;
    const now = new Date().toISOString();
    const existing = await db.select().from(taskCompletions).where(eq(taskCompletions.id, id)).limit(1);
    const isActive = existing.length > 0 && !existing[0].deletedAt;
    if (isActive) {
      await db
        .update(taskCompletions)
        .set({ deletedAt: now, updatedAt: now, syncState: 'pending', completedByUid: null })
        .where(eq(taskCompletions.id, id));
      emitLocalChange();
      return false;
    }
    if (existing.length > 0) {
      await db
        .update(taskCompletions)
        .set({ deletedAt: null, updatedAt: now, syncState: 'pending', completedByUid: null })
        .where(eq(taskCompletions.id, id));
    } else {
      const spaceId = await getItemSpaceId(taskId);
      await db.insert(taskCompletions).values({ id, taskId, date, updatedAt: now, syncState: 'pending', spaceId });
    }
    emitLocalChange();
    return true;
  },

  async listTaskCompletionDates(taskId: string, fromDate: string, toDate: string): Promise<string[]> {
    const rows = await db
      .select()
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.taskId, taskId),
          gte(taskCompletions.date, fromDate),
          lte(taskCompletions.date, toDate),
          isNull(taskCompletions.deletedAt),
        ),
      );
    return rows.map((r) => r.date);
  },

  async listByCategory(label: string): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(eq(dayItems.category, label), notDeleted))
      .orderBy(asc(dayItems.date));
    return rows.map(toDomain);
  },

  async listCategoryUsage(): Promise<{ category: string; status: 'inbox' | 'scheduled' | 'done' }[]> {
    const rows = await db
      .select({ category: dayItems.category, status: dayItems.status })
      .from(dayItems)
      .where(and(isNotNull(dayItems.category), notDeleted));
    return rows.map((r) => ({ category: r.category!, status: r.status }));
  },

  async listPendingSync(): Promise<PendingDayItem[]> {
    const rows = await db.select().from(dayItems).where(eq(dayItems.syncState, 'pending'));
    return rows.map((row) => ({
      id: row.id,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      categoryId: row.categoryId,
      spaceId: row.spaceId,
      completedByUid: row.completedByUid,
      item: row.deletedAt ? null : toDomain(row),
    }));
  },

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(dayItems).set({ syncState: 'synced' }).where(inArray(dayItems.id, ids));
  },

  async setCompletedByUid(id: string, uid: string): Promise<void> {
    await db.update(dayItems).set({ completedByUid: uid }).where(eq(dayItems.id, id));
  },

  async getCompletedByUidMap(ids: string[]): Promise<Record<string, string | null>> {
    if (ids.length === 0) return {};
    const rows = await db.select({ id: dayItems.id, completedByUid: dayItems.completedByUid }).from(dayItems).where(inArray(dayItems.id, ids));
    const map: Record<string, string | null> = {};
    for (const r of rows) map[r.id] = r.completedByUid;
    return map;
  },

  async getSyncVersion(id: string): Promise<SyncVersion | null> {
    const rows = await db
      .select({ updatedAt: dayItems.updatedAt, deletedAt: dayItems.deletedAt })
      .from(dayItems)
      .where(eq(dayItems.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async applyRemoteUpsert(item: DayItem, categoryId: string | null): Promise<void> {
    const row = { ...toRow(item, categoryId, null), syncState: 'synced' as const };
    await db.insert(dayItems).values(row).onConflictDoUpdate({ target: dayItems.id, set: row });
  },

  async applySpaceRemoteUpsert(item: DayItem, spaceId: string, completedByUid: string | null = null): Promise<void> {
    const row = { ...toRow(item, spaceId, spaceId), syncState: 'synced' as const, completedByUid };
    await db.insert(dayItems).values(row).onConflictDoUpdate({ target: dayItems.id, set: row });
  },

  async applyRemoteDelete(id: string, deletedAt: string): Promise<void> {
    const existing = await db.select({ id: dayItems.id }).from(dayItems).where(eq(dayItems.id, id)).limit(1);
    if (existing.length > 0) {
      await db.update(dayItems).set({ deletedAt, updatedAt: deletedAt, syncState: 'synced' }).where(eq(dayItems.id, id));
    }
  },

  async unlinkSpace(spaceId: string): Promise<void> {
    await db
      .update(dayItems)
      .set({ spaceId: null, updatedAt: new Date().toISOString(), syncState: 'pending' })
      .where(eq(dayItems.spaceId, spaceId));
    emitLocalChange();
  },

  async migrateCategoryToSpace(categoryId: string): Promise<{ itemIds: string[]; habitIds: string[]; taskIds: string[] }> {
    const rows = await db
      .select({ id: dayItems.id, type: dayItems.type })
      .from(dayItems)
      .where(and(eq(dayItems.categoryId, categoryId), notDeleted));
    const itemIds = rows.map((r) => r.id);
    const habitIds = rows.filter((r) => r.type === 'habit').map((r) => r.id);
    const taskIds = rows.filter((r) => r.type === 'task').map((r) => r.id);
    if (itemIds.length > 0) {
      await db
        .update(dayItems)
        .set({ spaceId: categoryId, updatedAt: new Date().toISOString(), syncState: 'pending' })
        .where(inArray(dayItems.id, itemIds));
      emitLocalChange();
    }
    return { itemIds, habitIds, taskIds };
  },
};
