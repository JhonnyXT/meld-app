import { create } from 'zustand';
import type { QuickAddType } from '@/domain/quickAdd';
import type { VoicePrefill } from '@/domain/voiceParser';

interface QuickAddState {
  visible: boolean;
  initialType: QuickAddType;
  /** Datos detectados por el comando de voz/texto para pre-llenar el sheet.
   * `null` en el flujo normal (FAB → Quick Add vacío). Se limpia al cerrar. */
  prefill: VoicePrefill | null;
  open: (type?: QuickAddType) => void;
  openWithPrefill: (prefill: VoicePrefill) => void;
  close: () => void;
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  visible: false,
  initialType: 'task',
  prefill: null,
  open: (type = 'task') => set({ visible: true, initialType: type, prefill: null }),
  openWithPrefill: (prefill) => set({ visible: true, initialType: prefill.type, prefill }),
  close: () => set({ visible: false, prefill: null }),
}));
