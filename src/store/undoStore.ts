import { create } from 'zustand';
import type { IconName } from '@/domain/iconNames';

export const UNDO_DURATION_MS = 4000;

interface UndoState {
  visible: boolean;
  message: string;
  icon: IconName;
  onUndo: (() => void) | null;
  timer: ReturnType<typeof setTimeout> | null;
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
