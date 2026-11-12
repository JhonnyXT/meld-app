import { eq } from 'drizzle-orm';
import { db } from './db';
import { spaceMembers } from './schema';

/** Caché local de `spaces/{id}/members/*` (SYNC_ROADMAP.md, Fase 4) — ver el comentario largo
 * en `schema.ts` → `spaceMembers`. Solo lectura rápida de nombre por uid para el badge
 * "completado por X"; la fuente de verdad sigue siendo Firestore (`listCategoryMembers` en
 * `src/sync/engine.ts`), esto es solo para no pegarle a la red por cada fila de Today. */
export const spaceMemberRepository = {
  async upsertMany(spaceId: string, members: { uid: string; name: string }[]): Promise<void> {
    const now = new Date().toISOString();
    for (const m of members) {
      const id = `${spaceId}:${m.uid}`;
      const row = { id, spaceId, uid: m.uid, name: m.name || m.uid, updatedAt: now };
      await db.insert(spaceMembers).values(row).onConflictDoUpdate({ target: spaceMembers.id, set: row });
    }
  },

  /** Nombre por uid, de CUALQUIER espacio (un uid que es dueño/editor de varios espacios tiene
   * el mismo nombre en todos — alcanza con la primera fila que matchee). `null` si todavía no se
   * sincronizó ningún espacio con ese uid como miembro. */
  async getName(uid: string): Promise<string | null> {
    const rows = await db.select({ name: spaceMembers.name }).from(spaceMembers).where(eq(spaceMembers.uid, uid)).limit(1);
    return rows[0]?.name ?? null;
  },

  /** Todo el mapa `uid -> name` de una sola vez — para cargarlo junto con `categoriesStore`
   * (pocas filas, máximo 6 miembros por espacio × los pocos espacios compartidos de este
   * teléfono) y resolver el badge "completado por X" en `TodayItemRow.tsx` sin un `await` por
   * fila. */
  async getAllNames(): Promise<Record<string, string>> {
    const rows = await db.select({ uid: spaceMembers.uid, name: spaceMembers.name }).from(spaceMembers);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.uid] = r.name;
    return map;
  },
};
