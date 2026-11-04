// API pública de la capa de sync. Pantallas y hooks importan de acá, nunca de Firebase directo
// (Regla #3 de SYNC_ROADMAP.md, vigilada por sync.boundary.test.ts).
export { signInWithGoogle, signOut, deleteAccount, type SessionUser } from './session';
export { useSession } from './useSession';
export { AuthError, authErrorMessage, classifyAuthError, type AuthErrorKind } from './errors';
