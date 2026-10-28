import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const dayItems = sqliteTable('day_items', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  date: text('date'),
  title: text('title').notNull(),
  category: text('category'),
  categoryColor: text('category_color'),
  reminderAt: text('reminder_at'),
  status: text('status', { enum: ['inbox', 'scheduled', 'done'] }).notNull(),
  type: text('type', {
    enum: ['task', 'event', 'habit', 'note', 'voiceMemo', 'moment'],
  }).notNull(),

  // Compartido por todos los tipos
  priority: text('priority', { enum: ['none', 'low', 'medium', 'high'] }).notNull().default('none'),

  // Task
  repeatRule: text('repeat_rule'),
  link: text('link'),

  // Event
  startTime: text('start_time'),
  endTime: text('end_time'),
  calendarSource: text('calendar_source'),

  // Habit
  targetFrequency: text('target_frequency'),
  currentStreak: integer('current_streak'),
  progress: text('progress'),
  autoTrack: integer('auto_track', { mode: 'boolean' }),
  healthMetric: text('health_metric'),
  /** Objetivo numérico solo para las métricas de "Actividad" (Steps/Exercise
   * minutes/Active energy/Sleep) — null para Anillos/Entrenamientos, que son
   * binarios (cerrado/no cerrado, hecho/no hecho). Ver `domain/healthMetrics.ts`. */
  healthMetricTarget: real('health_metric_target'),
  colorStyle: text('color_style', { enum: ['default', 'cool'] }),

  // Note
  richTextBody: text('rich_text_body'),

  // VoiceMemo
  audioFileUri: text('audio_file_uri'),
  durationSeconds: real('duration_seconds'),

  // Moment
  mediaUri: text('media_uri'),
  weekOfYear: integer('week_of_year'),

  // Sync (SYNC_ROADMAP.md, Fase 1). `categoryId` es la referencia real a
  // `categories.id` — `category`/`categoryColor` de arriba se conservan como
  // texto copiado (fallback de lectura si la categoría se borró o para
  // ítems viejos sin `categoryId`, ver `dayItemRepository`). `deletedAt` es
  // un borrado lógico (tombstone): sin nube todavía no cambia nada visible,
  // pero todas las queries ya lo excluyen para no tener que tocarlas de
  // nuevo cuando exista el respaldo. `syncState` queda sin usar hasta la
  // Fase 3 (no hay a qué sincronizar todavía).
  categoryId: text('category_id'),
  deletedAt: text('deleted_at'),
  syncState: text('sync_state', { enum: ['synced', 'pending'] }).notNull().default('pending'),
});

/** Un registro por día que un hábito se marcó como hecho. Es la fuente real
 * de `progress`/`currentStreak` (ver `domain/habit.ts`) y del heatmap de
 * Calendar > Año — las columnas `progress`/`current_streak` de `day_items`
 * quedan como snapshot inicial al crear el hábito, no se vuelven a leer para
 * mostrar el conteo real. */
export const habitCompletions = sqliteTable('habit_completions', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull(),
  date: text('date').notNull(),
  // Sync (Fase 1) — ver el comentario de `dayItems`. `id` ya es determinístico
  // (`${habitId}-${date}`), así que no hace falta UUID acá.
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncState: text('sync_state', { enum: ['synced', 'pending'] }),
});

/** Un registro por día que una task QUE REPITE (`repeatRule` no null) se
 * marcó hecha — mismo patrón que `habitCompletions`, ver `domain/task.ts`.
 * Una task sin `repeatRule` sigue usando directo la columna `status` de
 * `day_items` como siempre (esta tabla no aplica, no se toca). */
export const taskCompletions = sqliteTable('task_completions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  date: text('date').notNull(),
  // Sync (Fase 1) — ver el comentario de `habitCompletions`.
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncState: text('sync_state', { enum: ['synced', 'pending'] }),
});

/** Catálogo de categorías configurable por el usuario (Ajustes > Categorías,
 * ver `domain/category.ts`) — reemplaza la lista fija que vivía en
 * `domain/quickAdd.ts`. `category`/`categoryColor` en `day_items` siguen
 * siendo texto copiado al crear el ítem; `dayItemRepository` también
 * resuelve y guarda `categoryId` (ver Fase 1 del roadmap de sync). */
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  // Sync (Fase 1) — ver el comentario de `dayItems`.
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncState: text('sync_state', { enum: ['synced', 'pending'] }),
});
