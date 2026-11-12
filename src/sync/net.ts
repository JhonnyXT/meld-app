export const NETWORK_TIMEOUT_MS = 30000;

export class OfflineError extends Error {
  constructor(message = 'timeout') {
    super(message);
    this.name = 'OfflineError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number = NETWORK_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new OfflineError()), ms);
    promise.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

export function isOffline(e: unknown): boolean {
  if (e instanceof OfflineError) return true;
  const code = String((e as { code?: unknown } | null)?.code ?? '');
  return code.includes('unavailable') || code.includes('deadline-exceeded');
}
