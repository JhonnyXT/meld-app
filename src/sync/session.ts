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

async function googleCredential(): Promise<AuthCredential> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type === 'cancelled') throw new AuthError('cancelled');
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

export async function signOut(): Promise<void> {
  ensureFirebase();
  try {
    await firebaseSignOut(getAuth());
    await GoogleSignin.signOut().catch(() => undefined);
  } catch (e) {
    throw toAuthError(e);
  }
}

const RECENT_LOGIN_MS = 4 * 60 * 1000;

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
