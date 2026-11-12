import Database from 'better-sqlite3';
import { initDb, type SqliteLike } from './db';

/** Adaptador mínimo: `better-sqlite3` habla SQLite real (sin el runtime nativo de Expo), así que
 * corre el MISMO SQL que `initDb` ejecuta en el dispositivo — estos tests no duplican ni
 * reinterpretan las migraciones, las corren tal cual. */
function wrap(raw: Database.Database): SqliteLike {
  return {
    execSync: (sql: string) => raw.exec(sql),
    getFirstSync: <T>(sql: string) => (raw.prepare(sql).get() as T) ?? null,
  };
}

function columns(raw: Database.Database, table: string): string[] {
  return (raw.prepare(`PRAGMA table_info(${table});`).all() as { name: string }[]).map((r) => r.name);
}

describe('initDb — instalación nueva', () => {
  it('crea todas las tablas con sus columnas, sin lanzar', () => {
    const raw = new Database(':memory:');
    expect(() => initDb(wrap(raw))).not.toThrow();

    const tables = (raw.prepare("SELECT name FROM sqlite_master WHERE type='table';").all() as { name: string }[]).map(
      (r) => r.name,
    );
    expect(tables).toEqual(
      expect.arrayContaining(['day_items', 'habit_completions', 'task_completions', 'categories', 'space_members']),
    );

    // Columnas de Fase 4 (sync/compartir) tienen que estar desde el CREATE TABLE de una
    // instalación nueva, no solo llegar vía ALTER TABLE.
    expect(columns(raw, 'day_items')).toEqual(expect.arrayContaining(['space_id', 'completed_by_uid', 'category_id']));
    expect(columns(raw, 'habit_completions')).toEqual(expect.arrayContaining(['space_id', 'completed_by_uid']));
    expect(columns(raw, 'task_completions')).toEqual(expect.arrayContaining(['space_id', 'completed_by_uid']));
    expect(columns(raw, 'categories')).toEqual(expect.arrayContaining(['space_id', 'space_role', 'space_owner_uid']));

    raw.close();
  });

  it('siembra las 3 categorías default una sola vez', () => {
    const raw = new Database(':memory:');
    initDb(wrap(raw));
    const rows = raw.prepare('SELECT id FROM categories ORDER BY sort_order;').all() as { id: string }[];
    expect(rows.map((r) => r.id)).toEqual(['cat-work', 'cat-personal', 'cat-health']);
    raw.close();
  });

  it('es idempotente — correrla dos veces seguidas no lanza ni duplica la siembra', () => {
    const raw = new Database(':memory:');
    initDb(wrap(raw));
    expect(() => initDb(wrap(raw))).not.toThrow();
    const count = raw.prepare('SELECT COUNT(*) as c FROM categories;').get() as { c: number };
    expect(count.c).toBe(3);
    raw.close();
  });
});

describe('initDb — dispositivo con datos previos (esquema viejo, sin las columnas de Fase 4)', () => {
  /** Reconstruye el estado de `day_items`/`categories` ANTES de que existieran `space_id`/
   * `completed_by_uid`/etc. — el caso real que `addColumnIfMissing` existe para cubrir: un
   * dispositivo instalado hace meses, que actualiza la app y corre `initDb()` de nuevo sobre una
   * base que ya tiene filas. */
  function seedLegacySchema(raw: Database.Database) {
    raw.exec(`
      CREATE TABLE day_items (
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
        priority TEXT NOT NULL DEFAULT 'none'
      );
      INSERT INTO day_items (id, created_at, updated_at, date, title, category, category_color, status, type)
      VALUES ('legacy-1', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01', 'Tarea vieja', 'Work', '#4F84FF', 'scheduled', 'task');

      CREATE TABLE categories (
        id TEXT PRIMARY KEY NOT NULL,
        label TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO categories (id, label, icon, color, sort_order) VALUES ('cat-work', 'Work', 'briefcase', '#4F84FF', 0);
    `);
  }

  it('agrega las columnas nuevas sin perder las filas existentes', () => {
    const raw = new Database(':memory:');
    seedLegacySchema(raw);

    expect(() => initDb(wrap(raw))).not.toThrow();

    expect(columns(raw, 'day_items')).toEqual(expect.arrayContaining(['space_id', 'completed_by_uid', 'category_id']));
    const row = raw.prepare('SELECT * FROM day_items WHERE id = ?;').get('legacy-1') as Record<string, unknown>;
    expect(row.title).toBe('Tarea vieja');
    // No se re-siembran las 3 default porque `categories` ya tenía filas (solo 'Work').
    const categoryCount = raw.prepare('SELECT COUNT(*) as c FROM categories;').get() as { c: number };
    expect(categoryCount.c).toBe(1);

    raw.close();
  });

  it('hace el backfill de category_id por nombre contra categories', () => {
    const raw = new Database(':memory:');
    seedLegacySchema(raw);
    initDb(wrap(raw));

    const row = raw.prepare('SELECT category_id FROM day_items WHERE id = ?;').get('legacy-1') as { category_id: string | null };
    expect(row.category_id).toBe('cat-work');

    raw.close();
  });

  it('crear el índice de category_id no rompe aunque la tabla sea vieja (bug real ya corregido)', () => {
    // Regresión: antes el índice se creaba ANTES del `addColumnIfMissing`, y sobre una tabla vieja
    // (`CREATE TABLE IF NOT EXISTS` es un no-op) tiraba "no such column: category_id" sin try/catch,
    // abortando `initDb()` entero. Ver el comentario en `db.ts` junto al índice.
    const raw = new Database(':memory:');
    seedLegacySchema(raw);
    expect(() => initDb(wrap(raw))).not.toThrow();
    raw.close();
  });
});
