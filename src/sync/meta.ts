/**
 * Estado de la sync en este teléfono: hasta dónde se trajo cada colección, y de qué cuenta son
 * los datos. Puro — la lectura/escritura en AsyncStorage vive en `metaStore.ts`.
 *
 * A diferencia de `my-wallet-app` (que trackea versiones subidas por ítem en este `meta`), Meld
 * ya tiene esa marca en SQLite (`sync_state`, Fase 1): qué falta subir se lee directo de la base,
 * no hay que duplicarlo acá. Este `meta` solo guarda el cursor de bajada (para no releer todo cada
 * vez) y la cuenta dueña.
 */
import type { ItemCollection } from './mappers';

/** La clave de cursor de una colección personal es el nombre tal cual (`'items'`, ...); la de una
 * colección de un espacio compartido (Fase 4) lleva el id del espacio para no mezclar el
 * progreso de traída de uno con el de otro — ni con el del respaldo personal, que usa la misma
 * `ItemCollection` como clave simple. */
export type CursorKey = ItemCollection | `space:${string}:${ItemCollection}`;

export function spaceCursorKey(spaceId: string, kind: ItemCollection): CursorKey {
  return `space:${spaceId}:${kind}`;
}

/**
 * Sin `ownerUid`/conflicto de cuenta a propósito: SYNC_ROADMAP.md T7 decide que un primer login
 * con datos en el teléfono y en la nube simplemente se unen (ids estables desde la Fase 1, sin
 * colisión) — a diferencia de `my-wallet-app`, acá no hace falta preguntar Merge/Replace.
 */
export interface SyncMeta {
  /** Mayor `serverUpdatedAt` (ms) traído por colección (personal o de un espacio): la próxima
   * traída pide desde ahí. */
  cursors: Partial<Record<CursorKey, number>>;
  lastSyncAt: number | null;
}

export function emptyMeta(): SyncMeta {
  return { cursors: {}, lastSyncAt: null };
}

/** El cursor solo avanza (dos corridas no deben retrocederlo). */
export function advanceCursor(meta: SyncMeta, key: CursorKey, serverUpdatedAt: number): SyncMeta {
  const current = meta.cursors[key] ?? 0;
  if (serverUpdatedAt <= current) return meta;
  return { ...meta, cursors: { ...meta.cursors, [key]: serverUpdatedAt } };
}

/** Olvida el progreso de traída de un espacio (SYNC_ROADMAP.md, Fase 4) — al desconectarse (salió,
 * lo quitaron, el dueño lo eliminó), para que si en algún momento se vuelve a unir al mismo
 * `spaceId` la traída arranque de cero en vez de pensar que ya tiene todo desde el cursor viejo. */
export function forgetSpace(meta: SyncMeta, spaceId: string): SyncMeta {
  const cursors = { ...meta.cursors };
  for (const key of Object.keys(cursors) as CursorKey[]) {
    if (key.startsWith(`space:${spaceId}:`)) delete cursors[key];
  }
  return { ...meta, cursors };
}
