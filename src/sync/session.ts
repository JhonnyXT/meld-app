/**
 * Sesión con Google (SYNC_ROADMAP.md, T3/T7). Iniciar sesión es opcional: sin cuenta la app
 * funciona igual. Todas las funciones lanzan `AuthError` (ver `errors.ts`), nunca errores crudos
 * de Firebase/Google.
 */
import {
  deleteUser,
  getAuth,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
  signOut as firebaseSignOut,
  type AuthCredential,
  type User,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthError, classifyAuthError } from './errors';
import { ensureFirebase } from './firebase';

export interface SessionUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

export function toSessionUser(user: User): SessionUser {
  return {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

function toAuthError(error: unknown): AuthError {
  return error instanceof AuthError ? error : new AuthError(classifyAuthError(error), error);
}

/** Abre el selector de cuentas de Google y devuelve la credencial para Firebase. */
async function googleCredential(): Promise<AuthCredential> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type === 'cancelled') throw new AuthError('cancelled');
  // Sin idToken = falta el webClientId (Google no habilitado en Firebase al compilar).
  if (!result.data.idToken) throw new AuthError('unknown');
  return GoogleAuthProvider.credential(result.data.idToken);
}

export async function signInWithGoogle(): Promise<SessionUser> {
  ensureFirebase();
  try {
    const { user } = await signInWithCredential(getAuth(), await googleCredential());
    return toSessionUser(user);
  } catch (e) {
    throw toAuthError(e);
  }
}

/**
 * Cierra la sesión y deja todos los datos del teléfono (SYNC_ROADMAP.md, T8 llega en la Fase 3
 * con la pregunta Mantener/Borrar): sin respaldo todavía, "borrar" haría perder todo sin aviso.
 */
export async function signOut(): Promise<void> {
  ensureFirebase();
  try {
    await firebaseSignOut(getAuth());
    // Para que el próximo inicio muestre el selector de cuentas en vez de reusar la última.
    await GoogleSignin.signOut().catch(() => undefined);
  } catch (e) {
    throw toAuthError(e);
  }
}

/** Firebase exige un inicio de sesión de hace unos 5 minutos o menos para eliminar la cuenta. */
const RECENT_LOGIN_MS = 4 * 60 * 1000;

/**
 * Elimina la cuenta de Firebase (Google Play exige ofrecerlo). Los datos del teléfono se quedan.
 *
 * Orden: 1) si el inicio de sesión no es reciente, vuelve a pedir la cuenta ANTES de borrar nada
 * (cancelar ahí no deja una cuenta vacía a medio borrar); 2) `beforeDelete` borra lo de la nube
 * mientras aún hay sesión (las reglas lo exigen, Fase 3+); 3) borra el usuario.
 */
export async function deleteAccount(beforeDelete?: (uid: string) => Promise<void>): Promise<void> {
  ensureFirebase();
  const user = getAuth().currentUser;
  if (!user) return;
  try {
    const lastSignIn = Date.parse(user.metadata.lastSignInTime ?? '');
    if (!(Date.now() - lastSignIn < RECENT_LOGIN_MS)) {
      await reauthenticateWithCredential(user, await googleCredential());
    }
    if (beforeDelete) await beforeDelete(user.uid);
    try {
      await deleteUser(user);
    } catch (e) {
      if (classifyAuthError(e) !== 'recent-login') throw e;
      await reauthenticateWithCredential(user, await googleCredential());
      await deleteUser(user);
    }
    await GoogleSignin.revokeAccess().catch(() => undefined);
    await GoogleSignin.signOut().catch(() => undefined);
  } catch (e) {
    throw toAuthError(e);
  }
}
