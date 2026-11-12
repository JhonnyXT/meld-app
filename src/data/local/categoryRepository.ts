import { eq, asc, isNull, isNotNull, and, inArray, or } from 'drizzle-orm';
import { db } from './db';
import { categories } from './schema';
import type { Category, CategorySpaceLink, SpaceRole } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';
import { newId } from '@/domain/id';
import { emitLocalChange } from './localChanges';

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
  spaceId: string | null;
}

function toDomain(row: typeof categories.$inferSelect): Category {
  const space: CategorySpaceLink | undefined =
    row.spaceId && row.spaceRole && row.spaceOwnerUid
      ? { spaceId: row.spaceId, role: row.spaceRole, ownerUid: row.spaceOwnerUid }
      : undefined;
  return {
    id: row.id,
    label: row.label,
    icon: row.icon as IconName,
    color: row.color,
    sortOrder: row.sortOrder,
    ...(space ? { space } : {}),
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

  async remove(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db
      .update(categories)
      .set({ deletedAt: now, updatedAt: now, syncState: 'pending' })
      .where(eq(categories.id, id));
    emitLocalChange();
  },

  async setSpaceLink(id: string, link: CategorySpaceLink): Promise<void> {
    await db
      .update(categories)
      .set({ spaceId: link.spaceId, spaceRole: link.role, spaceOwnerUid: link.ownerUid })
      .where(eq(categories.id, id));
    emitLocalChange();
  },

  async applySpaceUpsert(
    spaceId: string,
    role: SpaceRole,
    ownerUid: string,
    config: { label: string; icon: IconName; color: string } | null,
  ): Promise<void> {
    const existing = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, spaceId)).limit(1);
    if (existing.length === 0) {
      const all = await db.select({ sortOrder: categories.sortOrder }).from(categories).where(notDeleted);
      const sortOrder = all.length > 0 ? Math.max(...all.map((r) => r.sortOrder)) + 1 : 0;
      await db.insert(categories).values({
        id: spaceId,
        label: config?.label ?? 'Compartido',
        icon: config?.icon ?? 'home',
        color: config?.color ?? '#8E8E93',
        sortOrder,
        updatedAt: new Date().toISOString(),
        syncState: 'synced',
        spaceId,
        spaceRole: role,
        spaceOwnerUid: ownerUid,
      });
    } else {
      await db
        .update(categories)
        .set({
          ...(config ? { label: config.label, icon: config.icon, color: config.color } : {}),
          deletedAt: null,
          spaceId,
          spaceRole: role,
          spaceOwnerUid: ownerUid,
        })
        .where(eq(categories.id, spaceId));
    }
    emitLocalChange();
  },

  async unlinkSpace(spaceId: string): Promise<void> {
    await db
      .update(categories)
      .set({ spaceId: null, spaceRole: null, spaceOwnerUid: null, updatedAt: new Date().toISOString(), syncState: 'pending' })
      .where(eq(categories.spaceId, spaceId));
    emitLocalChange();
  },

  async listSpaceLinked(): Promise<Category[]> {
    const rows = await db.select().from(categories).where(and(notDeleted, isNotNull(categories.spaceId)));
    return rows.map(toDomain);
  },

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
      spaceId: row.spaceId,
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
