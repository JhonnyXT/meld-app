import { create } from 'zustand';
import type { QuickAddType } from '@/domain/quickAdd';

interface QuickAddState {
  visible: boolean;
  initialType: QuickAddType;
  open: (type?: QuickAddType) => void;
  close: () => void;
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  visible: false,
  initialType: 'task',
  open: (type = 'task') => set({ visible: true, initialType: type }),
  close: () => set({ visible: false }),
}));
