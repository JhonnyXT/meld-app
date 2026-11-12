import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { ensureFirebase } from './firebase';
import { toSessionUser, type SessionUser } from './session';

interface SessionState {
  user: SessionUser | null;
  ready: boolean;
}

function currentState(): SessionState {
  ensureFirebase();
  const user = getAuth().currentUser;
  return { user: user ? toSessionUser(user) : null, ready: user != null };
}

export function useSession(): SessionState {
  const [state, setState] = useState(currentState);

  useEffect(
    () => onAuthStateChanged(getAuth(), (user) => setState({ user: user ? toSessionUser(user) : null, ready: true })),
    [],
  );

  return state;
}
