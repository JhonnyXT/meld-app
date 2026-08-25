import { create } from 'zustand';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import type { DayItem } from '@/domain/dayItem';
import { toDateKey } from '@/domain/date';
import { minutesToHour24, nowMinutes } from '@/domain/time';

interface RemindersState {
  visible: boolean;
  items: DayItem[];
  loading: boolean;
  open: () => Promise<void>;
  close: () => void;
}

export const useRemindersStore = create<RemindersState>((set) => ({
  visible: false,
  items: [],
  loading: false,

  open: async () => {
    set({ visible: true, loading: true });
    const nowIso = `${toDateKey(new Date())}T${minutesToHour24(nowMinutes())}:00.000Z`;
    const items = await dayItemRepository.listUpcomingReminders(nowIso);
    set({ items, loading: false });
  },

  close: () => set({ visible: false }),
}));
