import { create } from 'zustand';

/** Popup que aparece al mantener presionado el FAB "+": elegir entre agregar
 * por voz (pantalla full-screen de dictado) o por texto (Quick Add normal).
 * Un tap normal en el FAB sigue abriendo Quick Add directo, sin pasar por
 * acá. */
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
