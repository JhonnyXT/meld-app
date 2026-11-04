/** Estado visible del respaldo (Ajustes → Cuenta). No se persiste: se recalcula en cada corrida. */
import { create } from 'zustand';

export type SyncPhase =
  | 'idle'
  | 'syncing'
  /** Sin conexión: lo pendiente se sube al volver. */
  | 'offline'
  | 'error'
  /** Sin Pro: no se sube nada (el respaldo es de Pro). Lo local sigue intacto. */
  | 'paused';

interface SyncStatus {
  phase: SyncPhase;
  /** Cambios locales que aún no están en la nube. */
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
