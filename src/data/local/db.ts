import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqlite = openDatabaseSync('meld.db');

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

  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);
  // 3 categorías por default, una sola vez (tabla vacía = primer arranque o
  // instalación nueva) — a partir de ahí son filas normales, el usuario
  // puede renombrarlas/recolorearlas/borrarlas como a cualquier otra.
  const categoryCount = sqlite.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM categories;');
  if (categoryCount && categoryCount.c === 0) {
    sqlite.execSync(`
      INSERT INTO categories (id, label, icon, color, sort_order) VALUES
        ('cat-work', 'Work', 'briefcase', '#4F84FF', 0),
        ('cat-personal', 'Personal', 'person', '#A55CFF', 1),
        ('cat-health', 'Health', 'favorite', '#5dde97', 2);
    `);
  }
}
