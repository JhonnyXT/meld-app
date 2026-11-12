import { create } from 'zustand';

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error' | 'paused';

interface SyncStatus {
  phase: SyncPhase;
  pending: number;
  lastSyncAt: number | null;
  set: (patch: Partial<Omit<SyncStatus, 'set'>>) => void;
}

export const useSyncStatus = create<SyncStatus>((set) => ({
  phase: 'idle',
  pending: 0,
  lastSyncAt: null,
  set: (patch) => set(patch),
}));
