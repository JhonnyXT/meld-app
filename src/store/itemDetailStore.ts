import { create } from 'zustand';

interface ItemDetailState {
  itemId: string | null;
  open: (itemId: string) => void;
  close: () => void;
}

export const useItemDetailStore = create<ItemDetailState>((set) => ({
  itemId: null,
  open: (itemId) => set({ itemId }),
  close: () => set({ itemId: null }),
}));
