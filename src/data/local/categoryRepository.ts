import { eq, asc } from 'drizzle-orm';
import { db } from './db';
import { categories } from './schema';
import type { Category } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';

function toDomain(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    label: row.label,
    icon: row.icon as IconName,
    color: row.color,
    sortOrder: row.sortOrder,
  };
}

export const categoryRepository = {
  async list(): Promise<Category[]> {
    const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
    return rows.map(toDomain);
  },

  async create(input: { label: string; icon: IconName; color: string }): Promise<Category> {
    const existing = await db.select().from(categories).orderBy(asc(categories.sortOrder));
    const sortOrder = existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder)) + 1 : 0;
    const id = `cat-${Date.now()}`;
    await db.insert(categories).values({ id, label: input.label, icon: input.icon, color: input.color, sortOrder });
    return { id, ...input, sortOrder };
  },

  async update(id: string, patch: { label: string; icon: IconName; color: string }): Promise<void> {
    await db.update(categories).set(patch).where(eq(categories.id, id));
  },

  async remove(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  },
};
