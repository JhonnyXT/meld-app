import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqlite = openDatabaseSync('meld.db');

export const db = drizzle(sqlite, { schema });

export interface SqliteLike {
  execSync(sql: string): unknown;
  getFirstSync<T>(sql: string): T | null;
}

function addColumnIfMissing(conn: SqliteLike, table: string, columnDdl: string) {
  try {
    conn.execSync(`ALTER TABLE ${table} ADD COLUMN ${columnDdl};`);
  } catch {}
}

// ver docs/adr/0009-orden-de-migraciones-sqlite.md
export function initDb(conn: SqliteLike = sqlite) {
  conn.execSync(`
    CREATE TABLE IF NOT EXISTS day_items (
      id TEXT PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      date TEXT,
      title TEXT NOT NULL,
      category TEXT,
      category_color TEXT,
      reminder_at TEXT,
      status TEXT NOT NULL,
      type TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'none',
      repeat_rule TEXT,
      link TEXT,
      start_time TEXT,
      end_time TEXT,
      calendar_source TEXT,
      target_frequency TEXT,
      current_streak INTEGER,
      progress TEXT,
      auto_track INTEGER,
      health_metric TEXT,
      color_style TEXT,
      rich_text_body TEXT,
      audio_file_uri TEXT,
      duration_seconds REAL,
      media_uri TEXT,
      week_of_year INTEGER,
      category_id TEXT,
      deleted_at TEXT,
      sync_state TEXT NOT NULL DEFAULT 'pending',
      space_id TEXT,
      completed_by_uid TEXT,
      end_date TEXT
    );
  `);
  conn.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_date ON day_items(date);');
  conn.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_status ON day_items(status);');

  addColumnIfMissing(conn, 'day_items', 'health_metric_target REAL');
  addColumnIfMissing(conn, 'day_items', 'category_id TEXT');
  addColumnIfMissing(conn, 'day_items', 'deleted_at TEXT');
  addColumnIfMissing(conn, 'day_items', "sync_state TEXT NOT NULL DEFAULT 'pending'");
  conn.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_category_id ON day_items(category_id);');
  addColumnIfMissing(conn, 'day_items', 'space_id TEXT');
  conn.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_space_id ON day_items(space_id);');
  addColumnIfMissing(conn, 'day_items', 'completed_by_uid TEXT');
  addColumnIfMissing(conn, 'day_items', 'end_date TEXT');

  conn.execSync(`
    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY NOT NULL,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      updated_at TEXT,
      deleted_at TEXT,
      sync_state TEXT,
      space_id TEXT,
      completed_by_uid TEXT
    );
  `);
  conn.execSync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_habit_date ON habit_completions(habit_id, date);',
  );
  addColumnIfMissing(conn, 'habit_completions', 'updated_at TEXT');
  addColumnIfMissing(conn, 'habit_completions', 'deleted_at TEXT');
  addColumnIfMissing(conn, 'habit_completions', 'sync_state TEXT');
  addColumnIfMissing(conn, 'habit_completions', 'space_id TEXT');
  addColumnIfMissing(conn, 'habit_completions', 'completed_by_uid TEXT');

  conn.execSync(`
    CREATE TABLE IF NOT EXISTS task_completions (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      date TEXT NOT NULL,
      updated_at TEXT,
      deleted_at TEXT,
      sync_state TEXT,
      space_id TEXT,
      completed_by_uid TEXT
    );
  `);
  conn.execSync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_task_date ON task_completions(task_id, date);',
  );
  addColumnIfMissing(conn, 'task_completions', 'updated_at TEXT');
  addColumnIfMissing(conn, 'task_completions', 'deleted_at TEXT');
  addColumnIfMissing(conn, 'task_completions', 'sync_state TEXT');
  addColumnIfMissing(conn, 'task_completions', 'space_id TEXT');
  addColumnIfMissing(conn, 'task_completions', 'completed_by_uid TEXT');

  conn.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      deleted_at TEXT,
      sync_state TEXT,
      space_id TEXT,
      space_role TEXT,
      space_owner_uid TEXT
    );
  `);
  addColumnIfMissing(conn, 'categories', 'updated_at TEXT');
  addColumnIfMissing(conn, 'categories', 'deleted_at TEXT');
  addColumnIfMissing(conn, 'categories', 'sync_state TEXT');
  addColumnIfMissing(conn, 'categories', 'space_id TEXT');
  addColumnIfMissing(conn, 'categories', 'space_role TEXT');
  addColumnIfMissing(conn, 'categories', 'space_owner_uid TEXT');

  conn.execSync(`
    CREATE TABLE IF NOT EXISTS space_members (
      id TEXT PRIMARY KEY NOT NULL,
      space_id TEXT NOT NULL,
      uid TEXT NOT NULL,
      name TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  conn.execSync('CREATE INDEX IF NOT EXISTS idx_space_members_space_id ON space_members(space_id);');

  const categoryCount = conn.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM categories;');
  if (categoryCount && categoryCount.c === 0) {
    const now = new Date().toISOString();
    conn.execSync(`
      INSERT INTO categories (id, label, icon, color, sort_order, updated_at, sync_state) VALUES
        ('cat-work', 'Work', 'briefcase', '#4F84FF', 0, '${now}', 'pending'),
        ('cat-personal', 'Personal', 'person', '#A55CFF', 1, '${now}', 'pending'),
        ('cat-health', 'Health', 'favorite', '#5dde97', 2, '${now}', 'pending');
    `);
  }

  conn.execSync(`
    UPDATE day_items
    SET category_id = (SELECT id FROM categories WHERE categories.label = day_items.category LIMIT 1)
    WHERE category_id IS NULL AND category IS NOT NULL;
  `);
}
