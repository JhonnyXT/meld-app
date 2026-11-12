export interface Versioned {
  updatedAt: string;
  deletedAt?: string | null;
}

const isDeleted = (v: Versioned) => v.deletedAt != null;
const ms = (iso: string) => Date.parse(iso);

export function pickWinner(local: Versioned, remote: Versioned): 'local' | 'remote' {
  const localMs = ms(local.updatedAt);
  const remoteMs = ms(remote.updatedAt);
  if (remoteMs !== localMs) return remoteMs > localMs ? 'remote' : 'local';
  if (isDeleted(remote) !== isDeleted(local)) return isDeleted(remote) ? 'remote' : 'local';
  return 'local';
}
