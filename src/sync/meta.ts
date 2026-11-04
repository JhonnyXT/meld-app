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

/**
 * Sin `ownerUid`/conflicto de cuenta a propósito: SYNC_ROADMAP.md T7 decide que un primer login
 * con datos en el teléfono y en la nube simplemente se unen (ids estables desde la Fase 1, sin
 * colisión) — a diferencia de `my-wallet-app`, acá no hace falta preguntar Merge/Replace.
 */
export interface SyncMeta {
  /** Mayor `serverUpdatedAt` (ms) traído por colección: la próxima traída pide desde ahí. */
  cursors: Partial<Record<ItemCollection, number>>;
  lastSyncAt: number | null;
}

export function emptyMeta(): SyncMeta {
  return { cursors: {}, lastSyncAt: null };
}

/** El cursor solo avanza (dos corridas no deben retrocederlo). */
export function advanceCursor(meta: SyncMeta, key: ItemCollection, serverUpdatedAt: number): SyncMeta {
  const current = meta.cursors[key] ?? 0;
  if (serverUpdatedAt <= current) return meta;
  return { ...meta, cursors: { ...meta.cursors, [key]: serverUpdatedAt } };
}
