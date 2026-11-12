import Constants from 'expo-constants';
import { connectAuthEmulator, getAuth } from '@react-native-firebase/auth';
import { connectFirestoreEmulator, getFirestore } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { isDev } from '@/constants/appVariant';

const EMULATOR_HOST = 'localhost';
const AUTH_EMULATOR_PORT = 9098;
const FIRESTORE_EMULATOR_PORT = 8090;

let initialized = false;

export function ensureFirebase(): void {
  if (initialized) return;
  initialized = true;
  if (isDev) {
    connectAuthEmulator(getAuth(), `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`);
    connectFirestoreEmulator(getFirestore(), EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  }
  GoogleSignin.configure({
    webClientId: Constants.expoConfig?.extra?.googleWebClientId as string | undefined,
  });
}
