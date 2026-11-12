import { create } from 'zustand';

interface VoiceAddState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useVoiceAddStore = create<VoiceAddState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
