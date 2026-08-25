import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqlite = openDatabaseSync('trove.db');

export const db = drizzle(sqlite, { schema });

export function initDb() {
  sqlite.execSync(`
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
      week_of_year INTEGER
    );
  `);
  sqlite.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_date ON day_items(date);');
  sqlite.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_status ON day_items(status);');

  // Migración liviana: SQLite no soporta "ADD COLUMN IF NOT EXISTS", y el
  // `CREATE TABLE IF NOT EXISTS` de arriba no agrega columnas nuevas a una
  // tabla ya existente en un dispositivo con datos previos — por eso este
  // `ALTER TABLE` envuelto en try/catch (falla con "duplicate column name" si
  // ya corrió antes, que es el caso esperado en la mayoría de los arranques).
  try {
    sqlite.execSync('ALTER TABLE day_items ADD COLUMN health_metric_target REAL;');
  } catch {
    // Columna ya existe — no-op.
  }

  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY NOT NULL,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL
    );
  `);
  sqlite.execSync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_habit_date ON habit_completions(habit_id, date);',
  );
}
