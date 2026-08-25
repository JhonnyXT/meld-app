import { create } from 'zustand';

interface NavigateMenuState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useNavigateMenuStore = create<NavigateMenuState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
