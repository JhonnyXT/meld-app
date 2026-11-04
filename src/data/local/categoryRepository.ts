import { eq, asc, isNull, inArray, or } from 'drizzle-orm';
import { db } from './db';
import { categories } from './schema';
import type { Category } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';
import { newId } from '@/domain/id';
import { emitLocalChange } from './localChanges';

/** `updated_at` nulo = categoría de antes de la Fase 1 (sin backfill, ver `db.ts`) — ver el mismo
 * comentario en `dayItemRepository.ts`. */
const EPOCH = '1970-01-01T00:00:00.000Z';

export interface SyncVersion {
  updatedAt: string;
  deletedAt: string | null;
}

export interface PendingCategory {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
  category: Category | null;
}

function toDomain(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    label: row.label,
    icon: row.icon as IconName,
    color: row.color,
    sortOrder: row.sortOrder,
  };
}

const notDeleted = isNull(categories.deletedAt);

export const categoryRepository = {
  async list(): Promise<Category[]> {
    const rows = await db.select().from(categories).where(notDeleted).orderBy(asc(categories.sortOrder));
    return rows.map(toDomain);
  },

  async create(input: { label: string; icon: IconName; color: string }): Promise<Category> {
    const existing = await db.select().from(categories).where(notDeleted).orderBy(asc(categories.sortOrder));
    const sortOrder = existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder)) + 1 : 0;
    const id = newId();
    const now = new Date().toISOString();
    await db.insert(categories).values({
      id,
      label: input.label,
      icon: input.icon,
      color: input.color,
      sortOrder,
      updatedAt: now,
      syncState: 'pending',
    });
    emitLocalChange();
    return { id, ...input, sortOrder };
  },

  async update(id: string, patch: { label: string; icon: IconName; color: string }): Promise<void> {
    await db
      .update(categories)
      .set({ ...patch, updatedAt: new Date().toISOString(), syncState: 'pending' })
      .where(eq(categories.id, id));
    emitLocalChange();
  },

  /** Borrado lógico (SYNC_ROADMAP.md, Fase 1) — mismo criterio que
   * `dayItemRepository.remove`. Los ítems que apuntaban a esta categoría
   * conservan su texto copiado (`category`/`categoryColor`), exactamente
   * como antes de esta migración (ver CLAUDE.md → "Categorías
   * configurables"): se siguen mostrando con el nombre huérfano. */
  async remove(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db
      .update(categories)
      .set({ deletedAt: now, updatedAt: now, syncState: 'pending' })
      .where(eq(categories.id, id));
    emitLocalChange();
  },

  // ─── Sync (SYNC_ROADMAP.md, Fase 3) — ver el mismo bloque en `dayItemRepository.ts` ──────────

  // `sync_state IS NULL` = categoría de antes de la Fase 1, o las 3 default que `db.ts` inserta
  // directo por SQL sin pasar por acá — tratarla como pendiente también, o nunca sube.
  async listPendingSync(): Promise<PendingCategory[]> {
    const rows = await db
      .select()
      .from(categories)
      .where(or(eq(categories.syncState, 'pending'), isNull(categories.syncState)));
    return rows.map((row) => ({
      id: row.id,
      updatedAt: row.updatedAt ?? EPOCH,
      deletedAt: row.deletedAt,
      category: row.deletedAt ? null : toDomain(row),
    }));
  },

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(categories).set({ syncState: 'synced' }).where(inArray(categories.id, ids));
  },

  async getSyncVersion(id: string): Promise<SyncVersion | null> {
    const rows = await db
      .select({ updatedAt: categories.updatedAt, deletedAt: categories.deletedAt })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return rows[0] ? { updatedAt: rows[0].updatedAt ?? EPOCH, deletedAt: rows[0].deletedAt } : null;
  },

  async applyRemoteUpsert(category: Category, updatedAt: string): Promise<void> {
    const row = {
      id: category.id,
      label: category.label,
      icon: category.icon,
      color: category.color,
      sortOrder: category.sortOrder,
      updatedAt,
      deletedAt: null,
      syncState: 'synced' as const,
    };
    await db.insert(categories).values(row).onConflictDoUpdate({ target: categories.id, set: row });
  },

  async applyRemoteDelete(id: string, deletedAt: string): Promise<void> {
    const existing = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).limit(1);
    if (existing.length > 0) {
      await db.update(categories).set({ deletedAt, updatedAt: deletedAt, syncState: 'synced' }).where(eq(categories.id, id));
    }
  },
};
