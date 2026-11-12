import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyMeta, type SyncMeta } from './meta';

const KEY = 'meld-sync-meta';

export async function loadMeta(): Promise<SyncMeta> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyMeta();
    return { ...emptyMeta(), ...JSON.parse(raw) };
  } catch {
    return emptyMeta();
  }
}

export async function saveMeta(meta: SyncMeta): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(meta));
}

export async function clearMeta(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
