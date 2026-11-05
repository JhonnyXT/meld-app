import { eq, and, or, ne, lt, isNull, isNotNull, gte, lte, like, asc, inArray } from 'drizzle-orm';
import { db } from './db';
import { dayItems, habitCompletions, taskCompletions, categories } from './schema';
import { emitLocalChange } from './localChanges';
import type { DayItem } from '@/domain/dayItem';

/** Lo mínimo para que `src/sync/` decida con `pickWinner` sin traer el ítem entero. */
export interface SyncVersion {
  updatedAt: string;
  deletedAt: string | null;
}

/** Un `day_items` pendiente de subir: `item` es `null` cuando es un borrado (tombstone, sin
 * contenido que mandar — ver `src/sync/mappers.ts` → `tombstoneDoc`). */
export interface PendingDayItem {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
  categoryId: string | null;
  /** Fase 4 — a qué colección sube este ítem: `null` = `users/{uid}/items` (personal, el caso de
   * siempre); si no, `spaces/{spaceId}/items` en vez de ahí. Ver `schema.ts` → `dayItems.spaceId`. */
  spaceId: string | null;
  item: DayItem | null;
}

type Row = typeof dayItems.$inferSelect;
type NewRow = typeof dayItems.$inferInsert;

/** Toda query de lectura excluye lo borrado lógicamente (SYNC_ROADMAP.md,
 * Fase 1) — se combina con `and(...)` en cada `where`. */
const notDeleted = isNull(dayItems.deletedAt);

/** `updated_at` nulo en `habit_completions`/`task_completions` = fila de antes de la Fase 1
 * (columna agregada por `ALTER TABLE`, sin backfill — ver `db.ts`). Se trata como "lo más viejo
 * posible": nunca le gana a nada remoto con fecha real, pero tampoco rompe `pickWinner` (que
 * exige un ISO parseable). */
const EPOCH = '1970-01-01T00:00:00.000Z';

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

/** Resuelve `categoryId` (referencia real a `categories.id`) a partir del
 * nombre copiado en `item.category` — mismo criterio que el backfill de
 * `db.ts`. No se expone en el tipo `DayItem` del dominio (es bookkeeping de
 * sync, no un campo de negocio); vive solo acá, en el borde con SQLite. Si
 * el nombre no matchea ninguna categoría viva (se borró, o el ítem nunca
 * tuvo una), queda `null` — `category`/`categoryColor` siguen siendo la
 * fuente de lectura real hasta que algo (Fase 4) empiece a resolver por id. */
/** El espacio del hábito/task dueño de un completado (Fase 4) — leído una sola vez, al crear el
 * registro de completado por primera vez (ver el comentario de `resolveSpaceId`: estable de ahí
 * en más, nunca hace falta releerlo en un re-toggle). */
async function getItemSpaceId(itemId: string): Promise<string | null> {
  const rows = await db.select({ spaceId: dayItems.spaceId }).from(dayItems).where(eq(dayItems.id, itemId)).limit(1);
  return rows[0]?.spaceId ?? null;
}

async function resolveCategoryId(label: string | null): Promise<string | null> {
  if (!label) return null;
  const rows = await db.select({ id: categories.id }).from(categories).where(eq(categories.label, label)).limit(1);
  return rows[0]?.id ?? null;
}

/** El espacio al que viaja este ítem, a partir de su categoría (Fase 4 — ver el comentario largo
 * en `schema.ts` → `dayItems.spaceId`). `null` = categoría personal (o sin categoría): el ítem
 * sigue yendo al respaldo personal, el caso de siempre. Nota sobre D5 (My Wallet): mover un ítem
 * EXISTENTE de una categoría personal a una compartida (o viceversa, o entre dos espacios) tiene
 * que crear un id nuevo + tombstone del viejo, nunca reasignar `spaceId` en el mismo id — esa
 * migración todavía no tiene flujo de UI (Quick Add/detalle hoy dejan elegir cualquier categoría
 * sin distinguir), así que por ahora esto solo garantiza que un ítem NUEVO creado directo en una
 * categoría compartida quede bien etiquetado desde el principio. */
async function resolveSpaceId(categoryId: string | null): Promise<string | null> {
  if (!categoryId) return null;
  const rows = await db.select({ spaceId: categories.spaceId }).from(categories).where(eq(categories.id, categoryId)).limit(1);
  return rows[0]?.spaceId ?? null;
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
    const rows = await db.select().from(dayItems).where(and(eq(dayItems.date, date), notDeleted));
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
          notDeleted,
        ),
      );
    return rows.map(toDomain);
  },

  async listByDateRange(startKey: string, endKey: string): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(gte(dayItems.date, startKey), lte(dayItems.date, endKey), notDeleted));
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

  /** Ítems con recordatorio (`reminderAt`) desde `nowIso` (mismo formato
   * "YYYY-MM-DDTHH:MM:00.000Z" de hora local, ver notes.ts), ordenados por
   * fecha/hora ascendente. Incluye el sentinel `ANY_TIME_HHMM` (Any Time). */
  async listUpcomingReminders(nowIso: string): Promise<DayItem[]> {
    const rows = await db
      .select()
      .from(dayItems)
      .where(and(isNotNull(dayItems.reminderAt), gte(dayItems.reminderAt, nowIso), notDeleted))
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
    const row = toRow(item, categoryId, spaceId);
    await db
      .insert(dayItems)
      .values(row)
      .onConflictDoUpdate({ target: dayItems.id, set: row });
    emitLocalChange();
  },

  /** Borrado lógico (SYNC_ROADMAP.md, Fase 1) — marca `deleted_at` en vez de
   * eliminar la fila, para que un futuro respaldo en la nube sepa que hay
   * que borrarla también ahí. Sin nube todavía, el efecto visible es el
   * mismo de siempre (todas las queries excluyen `deleted_at`). El historial
   * de completados (hábito/task que repite) SÍ se borra físico: una vez que
   * el ítem dueño desaparece, nadie necesita enterarse día por día de que
   * sus completados también desaparecieron. */
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
      .where(and(eq(dayItems.type, 'habit'), ne(dayItems.status, 'inbox'), notDeleted));
    return rows.map(toDomain);
  },

  /** Alterna (marca hecho/deshecho) el registro de "hecho" de un hábito para
   * `date`. El id es determinístico (`${habitId}-${date}`), así que
   * desmarcar y volver a marcar el mismo día reutiliza la misma fila
   * (limpia `deleted_at` en vez de insertar una nueva) — necesario porque,
   * a diferencia de borrar el ítem entero, acá sí puede volver a marcarse
   * (SYNC_ROADMAP.md, Fase 1: desmarcar es un tombstone, no un borrado
   * físico, para que la nube se entere). Devuelve el nuevo estado (`true` =
   * quedó marcado como hecho). */
  async toggleHabitCompletion(habitId: string, date: string): Promise<boolean> {
    const id = `${habitId}-${date}`;
    const now = new Date().toISOString();
    const existing = await db.select().from(habitCompletions).where(eq(habitCompletions.id, id)).limit(1);
    const isActive = existing.length > 0 && !existing[0].deletedAt;
    if (isActive) {
      await db
        .update(habitCompletions)
        .set({ deletedAt: now, updatedAt: now, syncState: 'pending' })
        .where(eq(habitCompletions.id, id));
      emitLocalChange();
      return false;
    }
    if (existing.length > 0) {
      await db
        .update(habitCompletions)
        .set({ deletedAt: null, updatedAt: now, syncState: 'pending' })
        .where(eq(habitCompletions.id, id));
    } else {
      const spaceId = await getItemSpaceId(habitId);
      await db.insert(habitCompletions).values({ id, habitId, date, updatedAt: now, syncState: 'pending', spaceId });
    }
    emitLocalChange();
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
          isNull(habitCompletions.deletedAt),
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
      .where(
        and(gte(habitCompletions.date, fromDate), lte(habitCompletions.date, toDate), isNull(habitCompletions.deletedAt)),
      );
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
      .where(and(eq(dayItems.type, 'task'), isNotNull(dayItems.repeatRule), ne(dayItems.status, 'inbox'), notDeleted));
    return rows.map(toDomain);
  },

  /** Alterna (marca hecho/deshecho) el registro de "hecho" de una task que
   * repite para `date` — mismo patrón que `toggleHabitCompletion`. Una task
   * sin `repeatRule` nunca pasa por acá, sigue usando `status` directo. */
  async toggleTaskCompletion(taskId: string, date: string): Promise<boolean> {
    const id = `${taskId}-${date}`;
    const now = new Date().toISOString();
    const existing = await db.select().from(taskCompletions).where(eq(taskCompletions.id, id)).limit(1);
    const isActive = existing.length > 0 && !existing[0].deletedAt;
    if (isActive) {
      await db
        .update(taskCompletions)
        .set({ deletedAt: now, updatedAt: now, syncState: 'pending' })
        .where(eq(taskCompletions.id, id));
      emitLocalChange();
      return false;
    }
    if (existing.length > 0) {
      await db
        .update(taskCompletions)
        .set({ deletedAt: null, updatedAt: now, syncState: 'pending' })
        .where(eq(taskCompletions.id, id));
    } else {
      const spaceId = await getItemSpaceId(taskId);
      await db.insert(taskCompletions).values({ id, taskId, date, updatedAt: now, syncState: 'pending', spaceId });
    }
    emitLocalChange();
    return true;
  },

  /** Fechas ("YYYY-MM-DD") en que una task que repite se marcó hecha, dentro
   * del rango inclusive `fromDate`-`toDate`. */
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
      .where(and(isNotNull(dayItems.category), notDeleted));
    return rows.map((r) => ({ category: r.category!, status: r.status }));
  },

  // ─── Sync (SYNC_ROADMAP.md, Fase 3) ──────────────────────────────────────
  // `src/sync/` es el único que llama a lo de acá abajo — nunca pantallas ni stores. Nada de esto
  // pasa por `notDeleted`: la sync necesita ver también los tombstones (para subirlos, o para
  // decidir con `pickWinner` si un borrado remoto le gana a una edición local viva).

  /** `day_items` con `sync_state = 'pending'` — todavía no reflejados en la nube. */
  async listPendingSync(): Promise<PendingDayItem[]> {
    const rows = await db.select().from(dayItems).where(eq(dayItems.syncState, 'pending'));
    return rows.map((row) => ({
      id: row.id,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      categoryId: row.categoryId,
      spaceId: row.spaceId,
      item: row.deletedAt ? null : toDomain(row),
    }));
  },

  /** Marca como subidas las filas que `src/sync/` acaba de confirmar en Firestore. */
  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(dayItems).set({ syncState: 'synced' }).where(inArray(dayItems.id, ids));
  },

  /** Versión local de un ítem (exista o no), para que `src/sync/` llame a `pickWinner` antes de
   * aplicar algo bajado de la nube. `null` = no existe en este teléfono (gana remoto siempre). */
  async getSyncVersion(id: string): Promise<SyncVersion | null> {
    const rows = await db
      .select({ updatedAt: dayItems.updatedAt, deletedAt: dayItems.deletedAt })
      .from(dayItems)
      .where(eq(dayItems.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Escribe un ítem bajado de la nube (ya ganó `pickWinner`) como `synced` — a diferencia de
   * `upsert()`, que siempre deja `pending` (sería subirlo de vuelta sin necesidad). Siempre del
   * respaldo PERSONAL (`users/{uid}/items`) — para uno de `spaces/{id}/items` usar
   * `applySpaceRemoteUpsert`. `spaceId` queda `null` a propósito. */
  async applyRemoteUpsert(item: DayItem, categoryId: string | null): Promise<void> {
    const row = { ...toRow(item, categoryId, null), syncState: 'synced' as const };
    await db.insert(dayItems).values(row).onConflictDoUpdate({ target: dayItems.id, set: row });
  },

  /** Lo mismo que `applyRemoteUpsert`, para un ítem bajado de `spaces/{spaceId}/items` en vez del
   * respaldo personal (SYNC_ROADMAP.md, Fase 4). `categoryId` = `spaceId` directo, sin lookup: la
   * categoría local de un espacio SIEMPRE tiene ese mismo id (ver el comentario largo en
   * `schema.ts` → `categories.spaceId`), así que no hace falta resolverlo por nombre como
   * `resolveCategoryId` hace con los ítems personales. */
  async applySpaceRemoteUpsert(item: DayItem, spaceId: string): Promise<void> {
    const row = { ...toRow(item, spaceId, spaceId), syncState: 'synced' as const };
    await db.insert(dayItems).values(row).onConflictDoUpdate({ target: dayItems.id, set: row });
  },

  /** Tombstone bajado de la nube (ya ganó `pickWinner`) para un id que puede no existir todavía
   * en este teléfono — a diferencia de `remove()`, no asume que la fila ya está. Sirve igual para
   * un ítem personal o de un espacio: no toca `categoryId`/`spaceId`, que ya quedaron bien puestos
   * cuando se creó la fila (acá solo se marca el borrado). */
  async applyRemoteDelete(id: string, deletedAt: string): Promise<void> {
    const existing = await db.select({ id: dayItems.id }).from(dayItems).where(eq(dayItems.id, id)).limit(1);
    if (existing.length > 0) {
      await db.update(dayItems).set({ deletedAt, updatedAt: deletedAt, syncState: 'synced' }).where(eq(dayItems.id, id));
    }
    // Si nunca existió acá, no hay nada que borrar — un tombstone de un ítem que este teléfono
    // nunca tuvo no necesita fila propia (a diferencia de users/{uid} en Firestore, que sí la
    // necesita para que otros dispositivos se enteren).
  },

  /** Desliga del espacio los ítems que apuntaban a él (salí/me sacaron/se eliminó, Fase 4) — los
   * conserva (igual que `categoryRepository.unlinkSpace` con la categoría), pero deja de
   * intentar subirlos a `spaces/{spaceId}/items`: de ahí en más suben al respaldo personal como
   * cualquier otro ítem de una categoría ya no compartida. */
  async unlinkSpace(spaceId: string): Promise<void> {
    await db
      .update(dayItems)
      .set({ spaceId: null, updatedAt: new Date().toISOString(), syncState: 'pending' })
      .where(eq(dayItems.spaceId, spaceId));
    emitLocalChange();
  },

  /** Al COMPARTIR una categoría existente (SYNC_ROADMAP.md, Fase 4): sus ítems ya en el teléfono
   * viajan al espacio nuevo (`spaceId` = `categoryId`, mismo criterio que una categoría recién
   * traída de la nube) y quedan `pending` para que el próximo push los suba a
   * `spaces/{categoryId}/items` en vez de (o además de, si ya estaban subidos) al respaldo
   * personal — quien llama usa los `habitIds`/`taskIds` devueltos para migrar también sus
   * `habit_completions`/`task_completions`, y los `itemIds` para tombstonear la copia vieja en
   * `users/{uid}/items` si la había (ver `src/sync/engine.ts` → `shareCategory`). A diferencia de
   * D5 (mover UN ítem entre categorías ya existentes), acá el `id` no cambia: el ítem no se mueve
   * de categoría, es la categoría la que pasa de personal a compartida. */
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
    }));
  },
  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(habitCompletions).set({ syncState: 'synced' }).where(inArray(habitCompletions.id, ids));
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
  async applySpaceRemoteUpsert(id: string, habitId: string, date: string, updatedAt: string, spaceId: string): Promise<void> {
    await db
      .insert(habitCompletions)
      .values({ id, habitId, date, updatedAt, deletedAt: null, syncState: 'synced', spaceId })
      .onConflictDoUpdate({
        target: [habitCompletions.habitId, habitCompletions.date],
        set: { updatedAt, deletedAt: null, syncState: 'synced', spaceId },
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

export const taskCompletionSyncRepository = {
  // `sync_state IS NULL` = fila de antes de la Fase 1 — ver el mismo comentario arriba.
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
    }));
  },
  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(taskCompletions).set({ syncState: 'synced' }).where(inArray(taskCompletions.id, ids));
  },
  async getSyncVersion(id: string): Promise<SyncVersion | null> {
    const rows = await db
      .select({ updatedAt: taskCompletions.updatedAt, deletedAt: taskCompletions.deletedAt })
      .from(taskCompletions)
      .where(eq(taskCompletions.id, id))
      .limit(1);
    return rows[0] ? { updatedAt: rows[0].updatedAt ?? EPOCH, deletedAt: rows[0].deletedAt } : null;
  },
  // Mismo criterio que `habitCompletionSyncRepository` — conflicto por `(task_id, date)`, no `id`.
  async applyRemoteUpsert(id: string, taskId: string, date: string, updatedAt: string): Promise<void> {
    await db
      .insert(taskCompletions)
      .values({ id, taskId, date, updatedAt, deletedAt: null, syncState: 'synced', spaceId: null })
      .onConflictDoUpdate({
        target: [taskCompletions.taskId, taskCompletions.date],
        set: { updatedAt, deletedAt: null, syncState: 'synced', spaceId: null },
      });
  },
  /** Mismo criterio que `habitCompletionSyncRepository.applySpaceRemoteUpsert`. */
  async applySpaceRemoteUpsert(id: string, taskId: string, date: string, updatedAt: string, spaceId: string): Promise<void> {
    await db
      .insert(taskCompletions)
      .values({ id, taskId, date, updatedAt, deletedAt: null, syncState: 'synced', spaceId })
      .onConflictDoUpdate({
        target: [taskCompletions.taskId, taskCompletions.date],
        set: { updatedAt, deletedAt: null, syncState: 'synced', spaceId },
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
  /** Mismo criterio que `dayItemRepository.unlinkSpace`. */
  async unlinkSpace(spaceId: string): Promise<void> {
    await db
      .update(taskCompletions)
      .set({ spaceId: null, updatedAt: new Date().toISOString(), syncState: 'pending' })
      .where(eq(taskCompletions.spaceId, spaceId));
    emitLocalChange();
  },

  /** Mismo criterio que `habitCompletionSyncRepository.migrateForHabits`, para las tasks que
   * `dayItemRepository.migrateCategoryToSpace` encontró en la categoría (su `taskIds`). */
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
