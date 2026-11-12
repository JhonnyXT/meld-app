import { create } from 'zustand';

interface AddMenuState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useAddMenuStore = create<AddMenuState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
