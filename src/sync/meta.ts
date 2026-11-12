import type { ItemCollection } from './mappers';

export type CursorKey = ItemCollection | `space:${string}:${ItemCollection}`;

export function spaceCursorKey(spaceId: string, kind: ItemCollection): CursorKey {
  return `space:${spaceId}:${kind}`;
}

export interface SyncMeta {
  cursors: Partial<Record<CursorKey, number>>;
  lastSyncAt: number | null;
}

export function emptyMeta(): SyncMeta {
  return { cursors: {}, lastSyncAt: null };
}

export function advanceCursor(meta: SyncMeta, key: CursorKey, serverUpdatedAt: number): SyncMeta {
  const current = meta.cursors[key] ?? 0;
  if (serverUpdatedAt <= current) return meta;
  return { ...meta, cursors: { ...meta.cursors, [key]: serverUpdatedAt } };
}

export function forgetSpace(meta: SyncMeta, spaceId: string): SyncMeta {
  const cursors = { ...meta.cursors };
  for (const key of Object.keys(cursors) as CursorKey[]) {
    if (key.startsWith(`space:${spaceId}:`)) delete cursors[key];
  }
  return { ...meta, cursors };
}
