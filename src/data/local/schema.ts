import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ver docs/adr/0008-modelo-de-datos-categorias-compartidas.md para spaceId/spaceRole/
// spaceOwnerUid/completedByUid/spaceMembers de este archivo.

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

  priority: text('priority', { enum: ['none', 'low', 'medium', 'high'] }).notNull().default('none'),

  repeatRule: text('repeat_rule'),
  link: text('link'),

  startTime: text('start_time'),
  endTime: text('end_time'),
  calendarSource: text('calendar_source'),
  endDate: text('end_date'),

  targetFrequency: text('target_frequency'),
  currentStreak: integer('current_streak'),
  progress: text('progress'),
  autoTrack: integer('auto_track', { mode: 'boolean' }),
  healthMetric: text('health_metric'),
  healthMetricTarget: real('health_metric_target'),
  colorStyle: text('color_style', { enum: ['default', 'cool'] }),

  richTextBody: text('rich_text_body'),

  audioFileUri: text('audio_file_uri'),
  durationSeconds: real('duration_seconds'),

  mediaUri: text('media_uri'),
  weekOfYear: integer('week_of_year'),

  categoryId: text('category_id'),
  deletedAt: text('deleted_at'),
  syncState: text('sync_state', { enum: ['synced', 'pending'] }).notNull().default('pending'),
  spaceId: text('space_id'),
  completedByUid: text('completed_by_uid'),
});

export const habitCompletions = sqliteTable('habit_completions', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull(),
  date: text('date').notNull(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncState: text('sync_state', { enum: ['synced', 'pending'] }),
  spaceId: text('space_id'),
  completedByUid: text('completed_by_uid'),
});

export const taskCompletions = sqliteTable('task_completions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  date: text('date').notNull(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncState: text('sync_state', { enum: ['synced', 'pending'] }),
  spaceId: text('space_id'),
  completedByUid: text('completed_by_uid'),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
  syncState: text('sync_state', { enum: ['synced', 'pending'] }),
  spaceId: text('space_id'),
  spaceRole: text('space_role', { enum: ['editor', 'viewer'] }),
  spaceOwnerUid: text('space_owner_uid'),
});

export const spaceMembers = sqliteTable('space_members', {
  id: text('id').primaryKey(),
  spaceId: text('space_id').notNull(),
  uid: text('uid').notNull(),
  name: text('name').notNull(),
  updatedAt: text('updated_at').notNull(),
});
