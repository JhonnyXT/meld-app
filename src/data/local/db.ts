import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqlite = openDatabaseSync('meld.db');

export const db = drizzle(sqlite, { schema });

/** Subconjunto de la API de `expo-sqlite` que `initDb` realmente usa — permite inyectar una
 * conexión distinta en tests (`better-sqlite3`, que habla SQLite real sin el runtime nativo de
 * Expo) sin duplicar ni un carácter del SQL de las migraciones. Ver `db.migrations.test.ts`. */
export interface SqliteLike {
  execSync(sql: string): unknown;
  getFirstSync<T>(sql: string): T | null;
}

/** Agrega una columna si no existe. SQLite no soporta "ADD COLUMN IF NOT
 * EXISTS": el `catch` absorbe "duplicate column name", que es el caso
 * esperado en la mayoría de los arranques (ya corrió antes). Usado para
 * migrar dispositivos con datos previos; una instalación nueva ya la trae
 * en el `CREATE TABLE`. */
function addColumnIfMissing(conn: SqliteLike, table: string, columnDdl: string) {
  try {
    conn.execSync(`ALTER TABLE ${table} ADD COLUMN ${columnDdl};`);
  } catch {
    // Columna ya existe — no-op.
  }
}

/** `conn` solo se pasa en tests (`db.migrations.test.ts`) — en la app real siempre corre sobre
 * `sqlite` (el default), nunca se le pasa nada distinto desde `app/_layout.tsx` ni el resto de
 * call-sites. */
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
      completed_by_uid TEXT
    );
  `);
  conn.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_date ON day_items(date);');
  conn.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_status ON day_items(status);');

  addColumnIfMissing(conn, 'day_items', 'health_metric_target REAL');
  // Sync (SYNC_ROADMAP.md, Fase 1) — dispositivos con datos previos a estas
  // 3 columnas. `sync_state` necesita un DEFAULT porque la columna queda
  // NOT NULL (SQLite exige uno para agregar NOT NULL a una tabla con filas).
  // Tienen que ir ANTES del índice de `category_id`: en un dispositivo con
  // datos previos, el `CREATE TABLE IF NOT EXISTS` de arriba es un no-op (la
  // tabla ya existe sin esta columna), así que crear el índice antes de
  // agregarla rompe con "no such column: category_id" (bug real, visto en
  // dispositivo — `execSync` no está en try/catch como `addColumnIfMissing`,
  // así que tiraba abajo `initDb()` entero sin tocar nada más).
  addColumnIfMissing(conn, 'day_items', 'category_id TEXT');
  addColumnIfMissing(conn, 'day_items', 'deleted_at TEXT');
  addColumnIfMissing(conn, 'day_items', "sync_state TEXT NOT NULL DEFAULT 'pending'");
  conn.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_category_id ON day_items(category_id);');
  // Categorías compartidas (Fase 4) — ver el comentario largo en `schema.ts` →
  // `dayItems.spaceId`/`categories.spaceId`.
  addColumnIfMissing(conn, 'day_items', 'space_id TEXT');
  conn.execSync('CREATE INDEX IF NOT EXISTS idx_day_items_space_id ON day_items(space_id);');
  // Indicador "quién completó esto" (Fase 4) — ver el comentario largo en `schema.ts` →
  // `dayItems.completedByUid`.
  addColumnIfMissing(conn, 'day_items', 'completed_by_uid TEXT');

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

  // Caché local de nombres de miembros (Fase 4) — ver el comentario largo en `schema.ts` →
  // `spaceMembers`.
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

  // 3 categorías por default, una sola vez (tabla vacía = primer arranque o
  // instalación nueva) — a partir de ahí son filas normales, el usuario
  // puede renombrarlas/recolorearlas/borrarlas como a cualquier otra.
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

  // Backfill de `category_id` (SYNC_ROADMAP.md, Fase 1): ítems creados antes
  // de esta columna solo tienen el texto copiado (`category`). Se resuelve
  // por nombre contra la tabla de categorías — idempotente (una vez resuelto
  // un ítem, `category_id IS NULL` deja de incluirlo en corridas futuras), y
  // barato incluso en cada arranque dado el volumen de esta app.
  conn.execSync(`
    UPDATE day_items
    SET category_id = (SELECT id FROM categories WHERE categories.label = day_items.category LIMIT 1)
    WHERE category_id IS NULL AND category IS NOT NULL;
  `);
}
