import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { habitCompletionSyncRepository } from '@/data/local/habitCompletionRepository';
import { taskCompletionSyncRepository } from '@/data/local/taskCompletionRepository';
import type { DayItem, Habit, Task } from '@/domain/dayItem';
import { toDateKey, fromDateKey, addDays } from '@/domain/date';
import { getWeekRange } from '@/domain/week';
import { isHabitScheduledOn, computeWeekProgress, computeStreak } from '@/domain/habit';
import { isTaskScheduledOn } from '@/domain/task';
import { cancelReminderNotification, syncReminderNotification } from '@/services/notifications';
import { useUndoStore } from '@/store/undoStore';
import { useSettingsStore } from '@/store/settingsStore';
import { translate } from '@/i18n';
import { refreshWidgets } from '@/widget/refreshWidgets';

async function loadHabitOccurrences(dateKey: string): Promise<{ habits: Habit[]; completedMap: Record<string, boolean> }> {
  const referenceDate = fromDateKey(dateKey);
  const allHabits = (await dayItemRepository.listActiveHabits()) as Habit[];
  const scheduled = allHabits.filter((h) => isHabitScheduledOn(h.targetFrequency, referenceDate));

  const { end: weekEnd } = getWeekRange(referenceDate);
  const streakFrom = toDateKey(addDays(referenceDate, -365));

  const results = await Promise.all(
    scheduled.map(async (habit) => {
      const dates = await dayItemRepository.listHabitCompletionDates(habit.id, streakFrom, toDateKey(weekEnd));
      const dateSet = new Set(dates);
      const updated: Habit = {
        ...habit,
        progress: computeWeekProgress(habit.targetFrequency, dateSet, referenceDate),
        currentStreak: computeStreak(habit.targetFrequency, dateSet, referenceDate),
      };
      return { habit: updated, completed: dateSet.has(dateKey) };
    }),
  );

  const habits: Habit[] = [];
  const completedMap: Record<string, boolean> = {};
  for (const r of results) {
    habits.push(r.habit);
    completedMap[r.habit.id] = r.completed;
  }
  return { habits, completedMap };
}

async function loadTaskOccurrences(dateKey: string): Promise<{ tasks: Task[]; completedMap: Record<string, boolean> }> {
  const referenceDate = fromDateKey(dateKey);
  const allTasks = (await dayItemRepository.listActiveRepeatingTasks()) as Task[];
  const scheduled = allTasks.filter((t) => t.date && t.repeatRule && isTaskScheduledOn(t.repeatRule, fromDateKey(t.date), referenceDate));

  const results = await Promise.all(
    scheduled.map(async (task) => {
      const dates = await dayItemRepository.listTaskCompletionDates(task.id, dateKey, dateKey);
      return { task, completed: dates.length > 0 };
    }),
  );

  const tasks: Task[] = [];
  const completedMap: Record<string, boolean> = {};
  for (const r of results) {
    tasks.push(r.task);
    completedMap[r.task.id] = r.completed;
  }
  return { tasks, completedMap };
}

async function recomputeHabitProgress(
  get: () => DayItemsState,
  set: (partial: Partial<DayItemsState>) => void,
  item: Habit,
  dateKey: string,
): Promise<void> {
  const referenceDate = fromDateKey(dateKey);
  const { end: weekEnd } = getWeekRange(referenceDate);
  const streakFrom = toDateKey(addDays(referenceDate, -365));
  const dates = await dayItemRepository.listHabitCompletionDates(item.id, streakFrom, toDateKey(weekEnd));
  const dateSet = new Set(dates);
  const updated: Habit = {
    ...item,
    progress: computeWeekProgress(item.targetFrequency, dateSet, referenceDate),
    currentStreak: computeStreak(item.targetFrequency, dateSet, referenceDate),
  };
  set({ items: get().items.map((i) => (i.id === item.id ? updated : i)) });
}

interface DayItemsState {
  selectedDateKey: string;
  items: DayItem[];
  habitCompletedMap: Record<string, boolean>;
  taskCompletedMap: Record<string, boolean>;
  completedByMap: Record<string, string | null>;
  loading: boolean;
  setSelectedDate: (date: Date) => Promise<void>;
  reload: () => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  toggleHabitComplete: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearVoiceMemoAudio: (id: string) => Promise<void>;
}

export const useDayItemsStore = create<DayItemsState>((set, get) => ({
  selectedDateKey: toDateKey(new Date()),
  items: [],
  habitCompletedMap: {},
  taskCompletedMap: {},
  completedByMap: {},
  loading: true,

  setSelectedDate: async (date: Date) => {
    const key = toDateKey(date);
    set({ selectedDateKey: key });
    await get().reload();
  },

  reload: async () => {
    set({ loading: true });
    const dateKey = get().selectedDateKey;
    const isRealToday = dateKey === toDateKey(new Date());
    const habitsEnabled = useSettingsStore.getState().habitsInTodayEnabled;

    const [dateItems, habitData, taskData, overdueTasks, habitCompletedBy, taskCompletedBy] = await Promise.all([
      dayItemRepository.listByDate(dateKey),
      habitsEnabled ? loadHabitOccurrences(dateKey) : Promise.resolve(null),
      loadTaskOccurrences(dateKey),
      isRealToday ? dayItemRepository.listOverdueTasks(dateKey) : Promise.resolve([]),
      habitCompletionSyncRepository.getCompletedByUidMap(dateKey),
      taskCompletionSyncRepository.getCompletedByUidMap(dateKey),
    ]);

    let items = dateItems;
    let habitCompletedMap: Record<string, boolean> = {};
    if (habitData) {
      habitCompletedMap = habitData.completedMap;
      const byId = new Map(dateItems.map((i) => [i.id, i] as const));
      for (const habit of habitData.habits) byId.set(habit.id, habit);
      items = Array.from(byId.values());
    }

    const taskCompletedMap = taskData.completedMap;
    if (taskData.tasks.length > 0) {
      const byId = new Map(items.map((i) => [i.id, i] as const));
      for (const task of taskData.tasks) byId.set(task.id, task);
      items = Array.from(byId.values());
    }

    if (overdueTasks.length > 0) {
      const seenIds = new Set(items.map((i) => i.id));
      const newOverdue = overdueTasks.filter((t) => !seenIds.has(t.id));
      items = [...newOverdue, ...items];
    }

    const itemCompletedBy = await dayItemRepository.getCompletedByUidMap(items.map((i) => i.id));
    const completedByMap = { ...itemCompletedBy, ...habitCompletedBy, ...taskCompletedBy };

    set({ items, habitCompletedMap, taskCompletedMap, completedByMap, loading: false });
    refreshWidgets();
  },

  toggleHabitComplete: async (id: string) => {
    const dateKey = get().selectedDateKey;
    const item = get().items.find((i) => i.id === id);
    if (!item || item.type !== 'habit') return;

    const completed = await dayItemRepository.toggleHabitCompletion(id, dateKey);
    set({ habitCompletedMap: { ...get().habitCompletedMap, [id]: completed } });
    await recomputeHabitProgress(get, set, item, dateKey);
    refreshWidgets();

    if (completed) {
      useUndoStore.getState().show(translate(useSettingsStore.getState().language, 'habitCompleted'), 'check', async () => {
        await dayItemRepository.toggleHabitCompletion(id, dateKey);
        set({ habitCompletedMap: { ...get().habitCompletedMap, [id]: false } });
        await recomputeHabitProgress(get, set, item, dateKey);
        refreshWidgets();
      });
    }
  },

  toggleComplete: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item || item.type !== 'task') return;

    if (item.repeatRule) {
      const dateKey = get().selectedDateKey;
      const completed = await dayItemRepository.toggleTaskCompletion(id, dateKey);
      set({ taskCompletedMap: { ...get().taskCompletedMap, [id]: completed } });
      refreshWidgets();
      if (completed) {
        useUndoStore.getState().show(translate(useSettingsStore.getState().language, 'taskCompleted'), 'check', async () => {
          await dayItemRepository.toggleTaskCompletion(id, dateKey);
          set({ taskCompletedMap: { ...get().taskCompletedMap, [id]: false } });
          refreshWidgets();
        });
      }
      return;
    }

    const nextStatus = item.status === 'done' ? 'scheduled' : 'done';
    const updated: DayItem = { ...item, status: nextStatus, updatedAt: new Date().toISOString() };
    await dayItemRepository.upsert(updated);
    set({ items: get().items.map((i) => (i.id === id ? updated : i)) });
    refreshWidgets();

    if (item.type === 'task' && nextStatus === 'done') {
      useUndoStore.getState().show(translate(useSettingsStore.getState().language, 'taskCompleted'), 'check', async () => {
        const reverted: DayItem = { ...updated, status: 'scheduled', updatedAt: new Date().toISOString() };
        await dayItemRepository.upsert(reverted);
        set({ items: get().items.map((i) => (i.id === id ? reverted : i)) });
        refreshWidgets();
      });
    }
  },

  remove: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    set({ items: get().items.filter((i) => i.id !== id) });
    await dayItemRepository.remove(id);
    await cancelReminderNotification(id);
    refreshWidgets();
    useUndoStore.getState().show(translate(useSettingsStore.getState().language, 'itemDeleted'), 'delete-outline', async () => {
      await dayItemRepository.upsert(item);
      await syncReminderNotification(item);
      const isRecurringHabitToday =
        item.type === 'habit' &&
        useSettingsStore.getState().habitsInTodayEnabled &&
        isHabitScheduledOn(item.targetFrequency, fromDateKey(get().selectedDateKey));
      const isRecurringTaskToday =
        item.type === 'task' &&
        !!item.repeatRule &&
        !!item.date &&
        isTaskScheduledOn(item.repeatRule, fromDateKey(item.date), fromDateKey(get().selectedDateKey));
      if (item.date === get().selectedDateKey || isRecurringHabitToday || isRecurringTaskToday) {
        set({ items: [...get().items, item] });
      }
      refreshWidgets();
    });
  },

  clearVoiceMemoAudio: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item || item.type !== 'voiceMemo') return;
    if (item.audioFileUri) {
      const file = new FileSystem.File(item.audioFileUri);
      if (file.exists) file.delete();
    }
    const updated: DayItem = { ...item, audioFileUri: '', durationSeconds: 0, updatedAt: new Date().toISOString() };
    await dayItemRepository.upsert(updated);
    set({ items: get().items.map((i) => (i.id === id ? updated : i)) });
    refreshWidgets();
  },
}));
