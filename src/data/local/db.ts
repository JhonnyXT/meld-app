import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqlite = openDatabaseSync('meld.db');

export const db = drizzle(sqlite, { schema });

/** Agrega una columna si no existe. SQLite no soporta "ADD COLUMN IF NOT
 * EXISTS": el `catch` absorbe "duplicate column name", que es el caso
 * esperado en la mayoría de los arranques (ya corrió antes). Usado para
 * migrar dispositivos con datos previos; una instalación nueva ya la trae
 * en el `CREATE TABLE`. */
function addColumnIfMissing(table: string, columnDdl: string) {
  try {
    sqlite.execSync(`ALTER TABLE ${table} ADD COLUMN ${columnDdl};`);
  } catch {
    // Columna ya existe — no-op.
  }
}

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
      week_of_year INTEGER,
      category_id TEXT,
      deleted_at TEXT,
      sync_state TEXT NOT NULL DEFAULT 'pending'
    );
  `);
  sqlite.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_date ON day_items(date);');
  sqlite.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_status ON day_items(status);');

  addColumnIfMissing('day_items', 'health_metric_target REAL');
  // Sync (SYNC_ROADMAP.md, Fase 1) — dispositivos con datos previos a estas
  // 3 columnas. `sync_state` necesita un DEFAULT porque la columna queda
  // NOT NULL (SQLite exige uno para agregar NOT NULL a una tabla con filas).
  // Tienen que ir ANTES del índice de `category_id`: en un dispositivo con
  // datos previos, el `CREATE TABLE IF NOT EXISTS` de arriba es un no-op (la
  // tabla ya existe sin esta columna), así que crear el índice antes de
  // agregarla rompe con "no such column: category_id" (bug real, visto en
  // dispositivo — `execSync` no está en try/catch como `addColumnIfMissing`,
  // así que tiraba abajo `initDb()` entero sin tocar nada más).
  addColumnIfMissing('day_items', 'category_id TEXT');
  addColumnIfMissing('day_items', 'deleted_at TEXT');
  addColumnIfMissing('day_items', "sync_state TEXT NOT NULL DEFAULT 'pending'");
  sqlite.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_category_id ON day_items(category_id);');

  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY NOT NULL,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      updated_at TEXT,
      deleted_at TEXT,
      sync_state TEXT
    );
  `);
  sqlite.execSync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_habit_date ON habit_completions(habit_id, date);',
  );
  addColumnIfMissing('habit_completions', 'updated_at TEXT');
  addColumnIfMissing('habit_completions', 'deleted_at TEXT');
  addColumnIfMissing('habit_completions', 'sync_state TEXT');

  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS task_completions (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      date TEXT NOT NULL,
      updated_at TEXT,
      deleted_at TEXT,
      sync_state TEXT
    );
  `);
  sqlite.execSync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_task_date ON task_completions(task_id, date);',
  );
  addColumnIfMissing('task_completions', 'updated_at TEXT');
  addColumnIfMissing('task_completions', 'deleted_at TEXT');
  addColumnIfMissing('task_completions', 'sync_state TEXT');

  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      deleted_at TEXT,
      sync_state TEXT
    );
  `);
  addColumnIfMissing('categories', 'updated_at TEXT');
  addColumnIfMissing('categories', 'deleted_at TEXT');
  addColumnIfMissing('categories', 'sync_state TEXT');

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

  // Backfill de `category_id` (SYNC_ROADMAP.md, Fase 1): ítems creados antes
  // de esta columna solo tienen el texto copiado (`category`). Se resuelve
  // por nombre contra la tabla de categorías — idempotente (una vez resuelto
  // un ítem, `category_id IS NULL` deja de incluirlo en corridas futuras), y
  // barato incluso en cada arranque dado el volumen de esta app.
  sqlite.execSync(`
    UPDATE day_items
    SET category_id = (SELECT id FROM categories WHERE categories.label = day_items.category LIMIT 1)
    WHERE category_id IS NULL AND category IS NOT NULL;
  `);
}
