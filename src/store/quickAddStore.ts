import { create } from 'zustand';
import type { QuickAddType } from '@/domain/quickAdd';
import type { VoicePrefill } from '@/domain/voiceParser';

interface QuickAddState {
  visible: boolean;
  initialType: QuickAddType;
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
