import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import type { DayItem, Habit } from '@/domain/dayItem';
import { toDateKey, fromDateKey, addDays } from '@/domain/date';
import { getWeekRange } from '@/domain/week';
import { isHabitScheduledOn, computeWeekProgress, computeStreak } from '@/domain/habit';
import { cancelReminderNotification, syncReminderNotification } from '@/services/notifications';
import { useUndoStore } from '@/store/undoStore';
import { useSettingsStore } from '@/store/settingsStore';
import { translate } from '@/i18n';
import { refreshWidgets } from '@/widget/refreshWidgets';

/** Trae las ocurrencias recurrentes de hábitos que corresponden a `dateKey`
 * (ver `domain/habit.ts` → `isHabitScheduledOn`), con `progress`/
 * `currentStreak` recalculados a partir del historial real de
 * `habit_completions` (las columnas homónimas de `day_items` son solo el
 * snapshot inicial al crear el hábito, no la fuente de verdad). Devuelve
 * también si cada uno ya se marcó hecho ese día, para `habitCompletedMap`. */
async function loadHabitOccurrences(dateKey: string): Promise<{ habits: Habit[]; completedMap: Record<string, boolean> }> {
  const referenceDate = fromDateKey(dateKey);
  const allHabits = (await dayItemRepository.listActiveHabits()) as Habit[];
  const scheduled = allHabits.filter((h) => isHabitScheduledOn(h.targetFrequency, referenceDate));

  const { end: weekEnd } = getWeekRange(referenceDate);
  // Rango amplio hacia atrás (1 año) para poder calcular rachas largas sin
  // volver a golpear la DB por cada hábito en cada tap.
  const streakFrom = toDateKey(addDays(referenceDate, -365));

  // `Promise.all` en vez de un `for...await` secuencial — con N hábitos
  // programados ese día, esperar cada `listHabitCompletionDates` uno detrás
  // del otro fue el cuello de botella real que hacía sentir lento cualquier
  // cambio de día (swipe, flechas, "Volver a hoy"): son consultas
  // independientes entre sí, no hay motivo para encadenarlas (pedido
  // explícito del usuario, 2026-09-16 — "se siente muy lento").
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

/** Recalcula `progress`/`currentStreak` de un hábito tras alternar su
 * completado en `dateKey` y actualiza `items` con la copia recalculada.
 * Compartido entre `toggleHabitComplete` y su acción de Deshacer. */
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
  /** habitId -> ¿ya se marcó hecho en `selectedDateKey`? Solo cubre hábitos
   * (ver `loadHabitOccurrences`). */
  habitCompletedMap: Record<string, boolean>;
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
  // Arranca en `true` para que "Hoy" pinte la maquetación de carga
  // (`components/ListSkeleton`) desde el primer frame, en vez del estado
  // vacío, hasta que el primer `reload()` traiga los ítems reales.
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

    // Las 3 consultas son independientes entre sí — dispararlas en paralelo
    // (en vez de encadenarlas con `await` una detrás de otra) es lo que
    // realmente se sentía lento al cambiar de día (swipe, flechas, "Volver a
    // hoy"): pedido explícito del usuario, 2026-09-16.
    const [dateItems, habitData, overdueTasks] = await Promise.all([
      dayItemRepository.listByDate(dateKey),
      habitsEnabled ? loadHabitOccurrences(dateKey) : Promise.resolve(null),
      // "Rollover" de tareas no cumplidas — solo cuando `dateKey` es el día
      // real de hoy (no al navegar a un día pasado/futuro): las tareas
      // pendientes de días anteriores se suman a la lista SIN tocar su
      // `date` real (ver `listOverdueTasks`), así que Calendario sigue
      // mostrándolas en su día original.
      isRealToday ? dayItemRepository.listOverdueTasks(dateKey) : Promise.resolve([]),
    ]);

    let items = dateItems;
    let habitCompletedMap: Record<string, boolean> = {};
    if (habitData) {
      habitCompletedMap = habitData.completedMap;
      // Merge por id: un hábito puede ya estar en `dateItems` si su propia
      // columna `date` (fecha de creación) coincide con `dateKey`.
      const byId = new Map(dateItems.map((i) => [i.id, i] as const));
      for (const habit of habitData.habits) byId.set(habit.id, habit);
      items = Array.from(byId.values());
    }

    // Van primero en el orden — lo atrasado se resuelve antes que lo nuevo
    // del día.
    if (overdueTasks.length > 0) {
      const seenIds = new Set(items.map((i) => i.id));
      const newOverdue = overdueTasks.filter((t) => !seenIds.has(t.id));
      items = [...newOverdue, ...items];
    }

    set({ items, habitCompletedMap, loading: false });
    // "Fire and forget" — no bloquea el reload de la pantalla ni depende de
    // que `selectedDateKey` sea hoy (el widget recalcula su propio "hoy"
    // desde cero, ver `getTodayWidgetData`). Un solo punto de enganche cubre
    // Quick Add/ItemDetailSheet (ambos llaman `reload()` al guardar) y el
    // resto de mutaciones de esta pantalla que también recargan.
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

    // Cualquier hábito (manual o "de salud") desaparece de Today al marcarse
    // hecho (ver TodayScreen → `visibleRows`), mismo patrón que Task — por
    // eso necesita el mismo snackbar de Deshacer como salida rápida antes de
    // que el filtro lo esconda ese día. La recurrencia (`isHabitScheduledOn`)
    // ya lo vuelve a traer al día siguiente si corresponde — ocultar es
    // puramente de renderizado, `habit_completions` es la única fuente de
    // verdad y nunca se toca por esto.
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
    if (!item) return;
    const nextStatus = item.status === 'done' ? 'scheduled' : 'done';
    const updated: DayItem = { ...item, status: nextStatus, updatedAt: new Date().toISOString() };
    await dayItemRepository.upsert(updated);
    set({ items: get().items.map((i) => (i.id === id ? updated : i)) });
    refreshWidgets();

    // Solo Task desaparece de la lista al completarse (ver TodayScreen →
    // `visibleRows`) — mostrar el Undo ahí es lo único que le da al usuario
    // una salida rápida antes de que el filtro la esconda para siempre ese
    // día. Otros tipos (hoy solo Task tiene checkbox tocable) no aplican.
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
      // Un hábito recurrente puede haber estado visible ese día sin que su
      // propia columna `date` (fecha de creación) coincida con `selectedDateKey`.
      const isRecurringHabitToday =
        item.type === 'habit' &&
        useSettingsStore.getState().habitsInTodayEnabled &&
        isHabitScheduledOn(item.targetFrequency, fromDateKey(get().selectedDateKey));
      if (item.date === get().selectedDateKey || isRecurringHabitToday) set({ items: [...get().items, item] });
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
