export type AuthErrorKind = 'cancelled' | 'offline' | 'unavailable' | 'recent-login' | 'unknown';

export class AuthError extends Error {
  constructor(
    readonly kind: AuthErrorKind,
    readonly cause?: unknown,
  ) {
    super(`auth:${kind}`);
  }
}

const CANCELLED = new Set(['12501', 'ASYNC_OP_IN_PROGRESS']);
const OFFLINE = new Set(['auth/network-request-failed', '7']);
const UNAVAILABLE = new Set(['PLAY_SERVICES_NOT_AVAILABLE']);

export function classifyAuthError(error: unknown): AuthErrorKind {
  if (error instanceof AuthError) return error.kind;
  const code = String((error as { code?: unknown } | null)?.code ?? '');
  if (CANCELLED.has(code)) return 'cancelled';
  if (OFFLINE.has(code)) return 'offline';
  if (UNAVAILABLE.has(code)) return 'unavailable';
  if (code === 'auth/requires-recent-login') return 'recent-login';
  return 'unknown';
}

export function authErrorMessage(kind: AuthErrorKind): string | null {
  switch (kind) {
    case 'cancelled':
      return null;
    case 'offline':
      return 'Necesitas conexión a internet para esto. Puedes seguir usando Meld sin cuenta.';
    case 'unavailable':
      return 'Este teléfono no tiene los servicios de Google necesarios para iniciar sesión.';
    case 'recent-login':
      return 'Por seguridad, vuelve a elegir tu cuenta de Google para continuar.';
    default:
      return 'No se pudo completar. Inténtalo de nuevo en un momento.';
  }
}
