import { create } from 'zustand';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { useDayItemsStore } from '@/store/dayItemsStore';
import { useInboxStore } from '@/store/inboxStore';
import { syncReminderNotification } from '@/services/notifications';
import { toDateKey } from '@/domain/date';
import { minutesToHour24 } from '@/domain/time';

interface TimeDragState {
  active: boolean;
  itemId: string | null;
  initialMinutes: number;
  currentMinutes: number;
  start: (itemId: string, initialMinutes: number) => void;
  setCurrentMinutes: (minutes: number) => void;
  close: () => void;
  confirm: () => Promise<void>;
}

export const useTimeDragStore = create<TimeDragState>((set, get) => ({
  active: false,
  itemId: null,
  initialMinutes: 0,
  currentMinutes: 0,
  start: (itemId, initialMinutes) => set({ active: true, itemId, initialMinutes, currentMinutes: initialMinutes }),
  setCurrentMinutes: (currentMinutes) => set({ currentMinutes }),
  close: () => set({ active: false, itemId: null }),
  confirm: async () => {
    const { itemId, currentMinutes, close } = get();
    if (!itemId) return;
    const item = await dayItemRepository.getById(itemId);
    if (item) {
      const dateKey = item.date ?? toDateKey(new Date());
      const updated = {
        ...item,
        date: dateKey,
        reminderAt: `${dateKey}T${minutesToHour24(currentMinutes)}:00.000Z`,
        status: 'scheduled' as const,
        updatedAt: new Date().toISOString(),
      };
      await dayItemRepository.upsert(updated);
      await syncReminderNotification(updated);
      useDayItemsStore.getState().reload();
      useInboxStore.getState().reload();
    }
    close();
  },
}));
