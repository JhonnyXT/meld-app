import { eq, asc, isNull, inArray, or } from 'drizzle-orm';
import { db } from './db';
import { categories } from './schema';
import type { Category, CategorySpaceLink } from '@/domain/category';
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

  /** Liga/desliga esta categoría a un espacio compartido (SYNC_ROADMAP.md, Fase 4) — usado por
   * los flujos de "Compartir"/"Unirme con un código"/"Salir" (todavía sin construir; esto solo
   * prepara el dato local). `link: null` = desconectar (la categoría queda personal de nuevo,
   * conserva sus ítems — "quien pierde el acceso conserva la categoría como propia"). No toca
   * `sync_state`: el vínculo con el espacio no es algo que suba a `users/{uid}/categories/*`
   * (vive en `spaces/{id}` mismo, ver `firestore.rules`), así que cambiarlo nunca debe disparar
   * una subida de la categoría al respaldo personal. */
  async setSpaceLink(id: string, link: CategorySpaceLink | null): Promise<void> {
    await db
      .update(categories)
      .set({
        spaceId: link?.spaceId ?? null,
        spaceRole: link?.role ?? null,
        spaceOwnerUid: link?.ownerUid ?? null,
      })
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
