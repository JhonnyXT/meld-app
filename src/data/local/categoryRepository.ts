import { eq, asc, isNull } from 'drizzle-orm';
import { db } from './db';
import { categories } from './schema';
import type { Category } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';
import { newId } from '@/domain/id';

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
    return { id, ...input, sortOrder };
  },

  async update(id: string, patch: { label: string; icon: IconName; color: string }): Promise<void> {
    await db
      .update(categories)
      .set({ ...patch, updatedAt: new Date().toISOString(), syncState: 'pending' })
      .where(eq(categories.id, id));
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
  },
};
