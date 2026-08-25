import { create } from 'zustand';
import type { IconName } from '@/domain/iconNames';

/** Cuánto tiempo queda disponible "Deshacer" antes de que la acción quede
 * definitiva — ver CLAUDE.md → "Undo real". Exportado porque
 * `FloatingBar`/`UndoRow` anima el anillo de progreso con esta misma
 * duración, para que el relleno termine exactamente cuando se auto-cierra. */
export const UNDO_DURATION_MS = 4000;

interface UndoState {
  visible: boolean;
  message: string;
  /** Ícono contextual de la tarjeta — "check" al completar, "delete-outline"
   * al eliminar (ver `UndoRow` en `components/FloatingBar.tsx`). */
  icon: IconName;
  onUndo: (() => void) | null;
  timer: ReturnType<typeof setTimeout> | null;
  /** Muestra la tarjeta de Undo. La acción ya se ejecutó (completado/borrado
   * real, no diferido) — `onUndo` solo necesita revertirla. Si ya había una
   * tarjeta visible, esa acción anterior queda definitiva en silencio (mismo
   * patrón que Gmail: solo un Undo pendiente a la vez). */
  show: (message: string, icon: IconName, onUndo: () => void) => void;
  undo: () => void;
  dismiss: () => void;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  visible: false,
  message: '',
  icon: 'check',
  onUndo: null,
  timer: null,

  show: (message, icon, onUndo) => {
    const prevTimer = get().timer;
    if (prevTimer) clearTimeout(prevTimer);
    const timer = setTimeout(() => get().dismiss(), UNDO_DURATION_MS);
    set({ visible: true, message, icon, onUndo, timer });
  },

  undo: () => {
    const { onUndo, timer } = get();
    if (timer) clearTimeout(timer);
    set({ visible: false, message: '', onUndo: null, timer: null });
    onUndo?.();
  },

  dismiss: () => {
    const { timer } = get();
    if (timer) clearTimeout(timer);
    set({ visible: false, message: '', onUndo: null, timer: null });
  },
}));
