import { dayItemRepository } from '@/data/local/dayItemRepository';
import { toDateKey, addDays } from '@/domain/date';
import { getWeekRange } from '@/domain/week';
import { isHabitScheduledOn, computeWeekProgress, computeStreak } from '@/domain/habit';
import { useSettingsStore } from '@/store/settingsStore';
import type { Habit } from '@/domain/dayItem';

export interface HabitWidgetRow {
  id: string;
  title: string;
  /** "5/7" (progreso semanal) — mismo criterio que `computeWeekProgress`. */
  progress: string;
  streak: number;
  completedToday: boolean;
}

export interface HabitsWidgetData {
  rows: HabitWidgetRow[];
  doneCount: number;
  totalCount: number;
}

const MAX_HABIT_ROWS = 10;

/** Datos del widget "Hábitos" — solo hábitos programados HOY
 * (`isHabitScheduledOn`), con su progreso semanal real y racha (mismo
 * cálculo que `dayItemsStore` → `loadHabitOccurrences`, reimplementado acá
 * sin depender del store para poder correr también desde el headless task
 * de Android). Respeta el toggle "Hábitos en Hoy" de Settings — si está
 * apagado, el widget queda vacío en vez de mostrar datos que la propia app
 * decidió no mostrar en Today. Los hábitos ya marcados hoy se filtran de
 * `rows` (siguen contando para `doneCount`) — mismo comportamiento que
 * Today, donde un hábito marcado desaparece de la lista (ver CLAUDE.md →
 * "Completar un hábito"), y en el widget además libera lugar para el
 * siguiente hábito pendiente. */
export async function getHabitsWidgetData(): Promise<HabitsWidgetData> {
  if (!useSettingsStore.getState().habitsInTodayEnabled) {
    return { rows: [], doneCount: 0, totalCount: 0 };
  }

  const today = new Date();
  const dateKey = toDateKey(today);
  const allHabits = (await dayItemRepository.listActiveHabits()) as Habit[];
  const scheduled = allHabits.filter((h) => isHabitScheduledOn(h.targetFrequency, today));

  const { end: weekEnd } = getWeekRange(today);
  const streakFrom = toDateKey(addDays(today, -365));

  const rows: HabitWidgetRow[] = [];
  let doneCount = 0;
  for (const habit of scheduled) {
    const dates = await dayItemRepository.listHabitCompletionDates(habit.id, streakFrom, toDateKey(weekEnd));
    const dateSet = new Set(dates);
    const completedToday = dateSet.has(dateKey);
    if (completedToday) doneCount++;
    rows.push({
      id: habit.id,
      title: habit.title,
      progress: computeWeekProgress(habit.targetFrequency, dateSet, today),
      streak: computeStreak(habit.targetFrequency, dateSet, today),
      completedToday,
    });
  }
  return {
    rows: rows.filter((r) => !r.completedToday).slice(0, MAX_HABIT_ROWS),
    doneCount,
    totalCount: scheduled.length,
  };
}
