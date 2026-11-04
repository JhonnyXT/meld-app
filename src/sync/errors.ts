/**
 * Errores de la cuenta, reducidos a lo que la UI necesita para elegir el mensaje. Sin imports de
 * Firebase ni Google Sign-In (se clasifican por su `code`), para poder probarlo en Jest.
 */

export type AuthErrorKind =
  /** El usuario cerró el selector de cuentas: no es un error, no se muestra nada. */
  | 'cancelled'
  /** Sin conexión. */
  | 'offline'
  /** Teléfono sin Google Play Services (o desactualizado). */
  | 'unavailable'
  /** Firebase pide un inicio de sesión reciente (borrar la cuenta). */
  | 'recent-login'
  | 'unknown';

export class AuthError extends Error {
  constructor(
    readonly kind: AuthErrorKind,
    readonly cause?: unknown,
  ) {
    super(`auth:${kind}`);
  }
}

// Códigos reales en Android: google-signin rechaza con `statusCodes` (12501 = cancelado,
// ASYNC_OP_IN_PROGRESS = doble toque, 7 = CommonStatusCodes.NETWORK_ERROR); Firebase con "auth/…".
// Un doble toque se trata como cancelado: el primer intento sigue su curso.
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

/** Texto para el usuario; null = no mostrar nada. */
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
