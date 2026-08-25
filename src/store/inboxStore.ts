import { create } from 'zustand';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import type { DayItem } from '@/domain/dayItem';
import { cancelReminderNotification, syncReminderNotification } from '@/services/notifications';
import { toDateKey } from '@/domain/date';
import { useUndoStore } from '@/store/undoStore';
import { useSettingsStore } from '@/store/settingsStore';
import { translate } from '@/i18n';

interface InboxState {
  items: DayItem[];
  loading: boolean;
  reload: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Captura rápida: crea una tarea directo en el Inbox con solo el título
   * (sin abrir Quick Add), como el campo "What's on your mind?" del header. */
  create: (title: string) => Promise<void>;
  /** Swipe hacia la derecha en una fila: agenda el ítem para hoy y lo saca
   * del Inbox (deja de ser status:'inbox'). */
  scheduleToday: (id: string) => Promise<void>;
  /** Selección múltiple: elimina varios ítems a la vez con un solo snackbar
   * "Deshacer" que restaura todos juntos. */
  bulkRemove: (ids: string[]) => Promise<void>;
  /** Selección múltiple: agenda varios ítems para hoy a la vez. */
  bulkScheduleToday: (ids: string[]) => Promise<void>;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  items: [],
  loading: false,

  reload: async () => {
    set({ loading: true });
    const items = await dayItemRepository.listInbox();
    set({ items, loading: false });
  },

  remove: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    set({ items: get().items.filter((i) => i.id !== id) });
    await dayItemRepository.remove(id);
    await cancelReminderNotification(id);
    useUndoStore.getState().show(translate(useSettingsStore.getState().language, 'itemDeleted'), 'delete-outline', async () => {
      await dayItemRepository.upsert(item);
      await syncReminderNotification(item);
      set({ items: [item, ...get().items] });
    });
  },

  create: async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const item: DayItem = {
      id: `task-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      date: null,
      title: trimmed,
      category: null,
      categoryColor: null,
      reminderAt: null,
      status: 'inbox',
      type: 'task',
      priority: 'none',
      repeatRule: null,
      link: null,
    };
    await dayItemRepository.upsert(item);
    set({ items: [item, ...get().items] });
  },

  scheduleToday: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const updated: DayItem = { ...item, date: toDateKey(new Date()), status: 'scheduled', updatedAt: new Date().toISOString() };
    await dayItemRepository.upsert(updated);
    set({ items: get().items.filter((i) => i.id !== id) });
  },

  bulkRemove: async (ids: string[]) => {
    const removed = get().items.filter((i) => ids.includes(i.id));
    if (removed.length === 0) return;
    set({ items: get().items.filter((i) => !ids.includes(i.id)) });
    await Promise.all(
      removed.map(async (item) => {
        await dayItemRepository.remove(item.id);
        await cancelReminderNotification(item.id);
      }),
    );
    const lang = useSettingsStore.getState().language;
    const message =
      removed.length === 1 ? translate(lang, 'itemDeleted') : translate(lang, 'itemsDeleted', { count: removed.length });
    useUndoStore.getState().show(message, 'delete-outline', async () => {
      await Promise.all(
        removed.map(async (item) => {
          await dayItemRepository.upsert(item);
          await syncReminderNotification(item);
        }),
      );
      set({ items: [...removed, ...get().items] });
    });
  },

  bulkScheduleToday: async (ids: string[]) => {
    const targets = get().items.filter((i) => ids.includes(i.id));
    if (targets.length === 0) return;
    const dateKey = toDateKey(new Date());
    set({ items: get().items.filter((i) => !ids.includes(i.id)) });
    await Promise.all(
      targets.map((item) =>
        dayItemRepository.upsert({ ...item, date: dateKey, status: 'scheduled', updatedAt: new Date().toISOString() }),
      ),
    );
  },
}));
