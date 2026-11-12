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
  // Categorías compartidas (Fase 4) — ver el comentario largo en `categories.spaceId`. NULL =
  // va al respaldo personal (`users/{uid}/items`, el caso de siempre); si no, a
  // `spaces/{spaceId}/items` en vez de ahí. Denormalizado (copiado de `categories.spaceId` al
  // crear el ítem) para que el motor de sync nunca necesite un JOIN contra `categories` en su
  // ruta caliente — y porque es seguro: mover un ítem a otra categoría (D5 de My Wallet, ver
  // roadmap) le da SIEMPRE un id nuevo + tombstone del viejo, nunca reasigna `spaceId` en el
  // mismo id, así que este valor es inmutable durante toda la vida de una fila.
  spaceId: text('space_id'),
  // Fase 4 — indicador "quién completó esto" (ítem compartido, task SIN `repeatRule`): quién
  // marcó `status: 'done'`. NULL mientras no está hecha, o en cualquier ítem personal (sin
  // `spaceId`, nunca se estampa ahí). Se fija al SUBIR, no al guardar localmente (ver
  // `src/sync/engine.ts` → `pushSpaces`): el repositorio no tiene forma de saber el uid de la
  // sesión sin importar Firebase, que viola la Regla #3 (la red solo vive en `src/sync/`) — ver
  // el comentario largo en `dayItemRepository.upsert` sobre cómo se limpia al des-completar.
  completedByUid: text('completed_by_uid'),
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
  // Fase 4 — copiado de `dayItems.spaceId` del hábito dueño al marcar/desmarcar (ver el
  // comentario largo en `dayItems.spaceId`): un hábito compartido nunca cambia de espacio en el
  // mismo id, así que esto es estable una vez escrito.
  spaceId: text('space_id'),
  // Fase 4 — quién marcó este día como hecho (mismo criterio que `dayItems.completedByUid`:
  // estampado al subir, no al guardar; NULL en un hábito personal). Al re-completar (reusa la
  // misma fila, limpiando `deletedAt`) se limpia también acá, para que quede atribuido a quien
  // re-completó, no a quien la había completado la vez anterior.
  completedByUid: text('completed_by_uid'),
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
  // Fase 4 — mismo criterio que `habitCompletions.spaceId`.
  spaceId: text('space_id'),
  // Fase 4 — mismo criterio que `habitCompletions.completedByUid`.
  completedByUid: text('completed_by_uid'),
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
  // Categorías compartidas (SYNC_ROADMAP.md, Fase 4). `spaceId` null = categoría personal (el
  // caso de siempre); si no, el id del espacio en `spaces/{spaceId}` — SIEMPRE igual a `id` de
  // esta misma fila ("Quien se une crea la categoría local con ese mismo id", ver "Modelo en
  // Firestore" del roadmap): columna aparte igual, por simetría con `space_id` en `day_items`/
  // `habit_completions`/`task_completions` (mismo nombre de columna en todas, mismo criterio de
  // query) y para no tener que tratar las categorías distinto si ese invariante cambia. `spaceRole`
  // es MI rol en este espacio ('editor'/'viewer', cacheado acá para no leer `spaces/{id}` en cada
  // chequeo de permiso de la UI — Quick Add/detalle/swipe/widgets con un lector). `spaceOwnerUid`
  // es quién es el dueño (compararlo con el uid de la sesión decide "puedo cambiar roles/
  // eliminar el espacio entero"). Los tres quedan NULL hasta que el paso de UI (compartir/unirse)
  // los empiece a llenar — esta migración solo prepara las columnas, sin flujo todavía.
  spaceId: text('space_id'),
  spaceRole: text('space_role', { enum: ['editor', 'viewer'] }),
  spaceOwnerUid: text('space_owner_uid'),
});

/** Caché local de `spaces/{id}/members/*` (SYNC_ROADMAP.md, Fase 4) — solo `uid → name`, para
 * resolver el badge "completado por X" (`DayItemRow` → `TrailingBadge` de tipo `completedBy`)
 * sin pegarle a la red en cada fila de Today. Se llena en `pullSpaces()`
 * (`src/sync/engine.ts`), reusando `listCategoryMembers(spaceId)` que ya existe para
 * `ShareCategorySheet`. `id` = `${spaceId}:${uid}` (compuesto, sin necesidad de clave primaria
 * de dos columnas en Drizzle/SQLite). Se desentiende sola al desvincularse de un espacio (nunca
 * se borra explícitamente — un nombre "stale" de un espacio ya abandonado es inofensivo, no se
 * vuelve a leer una vez que `categories.spaceId` para ese id es `null`). */
export const spaceMembers = sqliteTable('space_members', {
  id: text('id').primaryKey(),
  spaceId: text('space_id').notNull(),
  uid: text('uid').notNull(),
  name: text('name').notNull(),
  updatedAt: text('updated_at').notNull(),
});
