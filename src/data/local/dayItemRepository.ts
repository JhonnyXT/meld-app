import { eq, and, ne, lt, isNull, isNotNull, gte, lte, like, asc } from 'drizzle-orm';
import { db } from './db';
import { dayItems, habitCompletions, taskCompletions } from './schema';
import type { DayItem } from '@/domain/dayItem';

type Row = typeof dayItems.$inferSelect;
type NewRow = typeof dayItems.$inferInsert;

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

function toRow(item: DayItem): NewRow {
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
  };

  switch (item.type) {
    case 'task':
      return { ...base, repeatRule: item.repeatRule, link: item.link };
    case 'event':
      return { ...base, startTime: item.startTime, endTime: item.endTime, calendarSource: item.calendarSource, link: item.link };
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
    const rows = await db.select().from(dayItems).where(eq(dayItems.date, date));
    return rows.map(toDomain);
  },

  /** Tareas pendientes (`status: 'scheduled'`) con fecha ANTERIOR a
   * `beforeDateKey` — el "rollover" de tareas no cumplidas (pedido explícito
   * del usuario, 2026-09-16). Se mergean en Today sin tocar su `date` real
   * (ver `dayItemsStore.reload`), mismo patrón no-destructivo que ya usan
   * las ocurrencias recurrentes de hábitos — la tarea sigue viéndose en su
   * día original en Calendario, solo Today la "adelanta" hasta que se
   * completa. **Excluye tasks que repiten** (`repeatRule` no null): para
   * esas, que su `date` ancla quede en el pasado es normal (la recurrencia
   * real la trae de vuelta vía `listActiveRepeatingTasks`/
   * `isTaskScheduledOn`) — incluirlas acá además duplicaría la fila. */
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
        ),
      );
    return rows.map(toDomain);
  },

  async listByDateRange(startKey: string, endKey: string): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(gte(dayItems.date, startKey), lte(dayItems.date, endKey)));
    return rows.map(toDomain);
  },

  async listInbox(): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(isNull(dayItems.date), eq(dayItems.status, 'inbox')));
    return rows.map(toDomain);
  },

  async searchByTitle(query: string): Promise<DayItem[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const rows = await db
      .select()
      .from(dayItems)
      .where(like(dayItems.title, `%${trimmed}%`))
      .orderBy(asc(dayItems.date));
    return rows.map(toDomain);
  },

  /** Ítems con recordatorio (`reminderAt`) desde `nowIso` (mismo formato
   * "YYYY-MM-DDTHH:MM:00.000Z" de hora local, ver notes.ts), ordenados por
   * fecha/hora ascendente. Incluye el sentinel `ANY_TIME_HHMM` (Any Time). */
  async listUpcomingReminders(nowIso: string): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(isNotNull(dayItems.reminderAt), gte(dayItems.reminderAt, nowIso)))
      .orderBy(asc(dayItems.reminderAt));
    return rows.map(toDomain);
  },

  /** Títulos únicos de hábitos existentes — usado para la sección "HABITS" del
   * filtro de Calendario, donde cada hábito se filtra por su propia identidad
   * (título), no por el tipo genérico 'habit'. */
  async listDistinctHabitTitles(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ title: dayItems.title })
      .from(dayItems)
      .where(eq(dayItems.type, 'habit'))
      .orderBy(asc(dayItems.title));
    return rows.map((r) => r.title);
  },

  async getById(id: string): Promise<DayItem | null> {
    const rows = await db.select().from(dayItems).where(eq(dayItems.id, id)).limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  },

  async upsert(item: DayItem): Promise<void> {
    const row = toRow(item);
    await db
      .insert(dayItems)
      .values(row)
      .onConflictDoUpdate({ target: dayItems.id, set: row });
  },

  async remove(id: string): Promise<void> {
    await db.delete(dayItems).where(eq(dayItems.id, id));
    await db.delete(habitCompletions).where(eq(habitCompletions.habitId, id));
    await db.delete(taskCompletions).where(eq(taskCompletions.taskId, id));
  },

  /** Todos los hábitos existentes (definición recurrente) — a diferencia de
   * `listByDate`, ignora la columna `date` (que en un hábito representa su
   * fecha de creación, no "el único día que vive"). Usado para inyectar
   * ocurrencias recurrentes en Today (ver `dayItemsStore.reload`). Excluye
   * `status: 'inbox'` — un hábito mandado al Inbox desde `ItemDetailSheet`
   * (el único camino: vaciar su campo Fecha) deja de recurrir hasta que se
   * le asigne fecha de nuevo, igual que cualquier otro tipo. */
  async listActiveHabits(): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(eq(dayItems.type, 'habit'), ne(dayItems.status, 'inbox')));
    return rows.map(toDomain);
  },

  /** Alterna (inserta/borra) el registro de "hecho" de un hábito para `date`.
   * Devuelve el nuevo estado (`true` = quedó marcado como hecho). */
  async toggleHabitCompletion(habitId: string, date: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(habitCompletions)
      .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.date, date)))
      .limit(1);
    if (existing.length > 0) {
      await db.delete(habitCompletions).where(eq(habitCompletions.id, existing[0].id));
      return false;
    }
    await db.insert(habitCompletions).values({ id: `${habitId}-${date}`, habitId, date });
    return true;
  },

  /** Fechas ("YYYY-MM-DD") en que un hábito se marcó hecho, dentro del rango
   * inclusive `fromDate`-`toDate`. Usado para calcular progreso/racha. */
  async listHabitCompletionDates(habitId: string, fromDate: string, toDate: string): Promise<string[]> {
    const rows = await db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.habitId, habitId),
          gte(habitCompletions.date, fromDate),
          lte(habitCompletions.date, toDate),
        ),
      );
    return rows.map((r) => r.date);
  },

  /** Completados de TODOS los hábitos dentro del rango inclusive — usado por
   * el heatmap de Calendar > Año para agregar entre hábitos. */
  async listAllHabitCompletionsInRange(
    fromDate: string,
    toDate: string,
  ): Promise<{ habitId: string; date: string }[]> {
    const rows = await db
      .select()
      .from(habitCompletions)
      .where(and(gte(habitCompletions.date, fromDate), lte(habitCompletions.date, toDate)));
    return rows.map((r) => ({ habitId: r.habitId, date: r.date }));
  },

  /** Todas las tasks que repiten (`repeatRule` no null) — a diferencia de
   * `listByDate`, ignora qué tan lejos quedó su `date` (que en una task que
   * repite es su fecha ancla, no "el único día que vive"). Usado para
   * inyectar ocurrencias recurrentes en Today (ver `dayItemsStore.reload`),
   * mismo patrón que `listActiveHabits`. Excluye `status: 'inbox'` por la
   * misma razón que los hábitos. */
  async listActiveRepeatingTasks(): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(eq(dayItems.type, 'task'), isNotNull(dayItems.repeatRule), ne(dayItems.status, 'inbox')));
    return rows.map(toDomain);
  },

  /** Alterna (inserta/borra) el registro de "hecho" de una task que repite
   * para `date` — mismo patrón que `toggleHabitCompletion`. Una task sin
   * `repeatRule` nunca pasa por acá, sigue usando `status` directo. */
  async toggleTaskCompletion(taskId: string, date: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(taskCompletions)
      .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, date)))
      .limit(1);
    if (existing.length > 0) {
      await db.delete(taskCompletions).where(eq(taskCompletions.id, existing[0].id));
      return false;
    }
    await db.insert(taskCompletions).values({ id: `${taskId}-${date}`, taskId, date });
    return true;
  },

  /** Fechas ("YYYY-MM-DD") en que una task que repite se marcó hecha, dentro
   * del rango inclusive `fromDate`-`toDate`. */
  async listTaskCompletionDates(taskId: string, fromDate: string, toDate: string): Promise<string[]> {
    const rows = await db
      .select()
      .from(taskCompletions)
      .where(and(eq(taskCompletions.taskId, taskId), gte(taskCompletions.date, fromDate), lte(taskCompletions.date, toDate)));
    return rows.map((r) => r.date);
  },

  /** `category`/`status` de todos los ítems que tienen categoría asignada —
   * usado por `categoriesStore` para calcular, por categoría, cuántos ítems
   * están pendientes vs. cuántos hay en total (Ajustes > Categorías, badge
   * "N" o "Completado"). Liviano: se trae todo y se agrupa en memoria en vez
   * de un `GROUP BY` — el volumen de ítems de esta app es chico y así no
   * hace falta una segunda forma de armar la consulta con Drizzle. */
  async listCategoryUsage(): Promise<{ category: string; status: 'inbox' | 'scheduled' | 'done' }[]> {
    const rows = await db
      .select({ category: dayItems.category, status: dayItems.status })
      .from(dayItems)
      .where(isNotNull(dayItems.category));
    return rows.map((r) => ({ category: r.category!, status: r.status }));
  },
};
