/**
 * Resolución de conflictos de la sync (SYNC_ROADMAP.md, T4/T5): entre dos versiones del mismo
 * registro gana la última edición. Pura, sin red — la capa de sync la usa al bajar cambios.
 *
 * `updatedAt`/`deletedAt` en Meld son texto ISO (`new Date().toISOString()`, ver `schema.ts`), no
 * epoch ms — se comparan via `Date.parse`.
 */

export interface Versioned {
  /** Última edición, ISO 8601. */
  updatedAt: string;
  /** Borrado lógico (tombstone), ISO 8601; ausente o null = vivo. */
  deletedAt?: string | null;
}

const isDeleted = (v: Versioned) => v.deletedAt != null;
const ms = (iso: string) => Date.parse(iso);

/**
 * Qué versión conservar. Mayor `updatedAt` gana; en empate gana la borrada (un borrado no se
 * deshace por empate); si siguen empatadas, la local (no hay nada que escribir).
 */
export function pickWinner(local: Versioned, remote: Versioned): 'local' | 'remote' {
  const localMs = ms(local.updatedAt);
  const remoteMs = ms(remote.updatedAt);
  if (remoteMs !== localMs) return remoteMs > localMs ? 'remote' : 'local';
  if (isDeleted(remote) !== isDeleted(local)) return isDeleted(remote) ? 'remote' : 'local';
  return 'local';
}
