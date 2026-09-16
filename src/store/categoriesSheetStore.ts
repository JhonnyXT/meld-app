import { create } from 'zustand';

interface CategoriesSheetState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

/** Visibilidad de `CategoriesManagerSheet` (Ajustes > Categorías) — mismo
 * patrón de store dedicado que el resto de las hojas globales
 * (`navigateMenuStore`, `remindersStore`). */
export const useCategoriesSheetStore = create<CategoriesSheetState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
