import { addDays, toDateKey } from './date';
import { getWeekRange } from './week';
import { frequencyTarget } from './quickAdd';
import type { HeatmapDotState } from './calendarHeatmap';

export function isHabitScheduledOn(schedule: string, date: Date): boolean {
  if (schedule === 'Weekdays') {
    const dow = date.getDay();
    return dow !== 0 && dow !== 6;
  }
  return true;
}

function countWeekDone(completionDateKeys: ReadonlySet<string>, weekStart: Date): number {
  let done = 0;
  for (let i = 0; i < 7; i++) {
    if (completionDateKeys.has(toDateKey(addDays(weekStart, i)))) done++;
  }
  return done;
}

export function computeWeekProgress(
  schedule: string,
  completionDateKeys: ReadonlySet<string>,
  referenceDate: Date,
): string {
  const { start } = getWeekRange(referenceDate);
  const target = frequencyTarget(schedule);
  const done = countWeekDone(completionDateKeys, start);
  return `${Math.min(done, target)}/${target}`;
}

export function computeStreak(
  schedule: string,
  completionDateKeys: ReadonlySet<string>,
  referenceDate: Date,
): number {
  if (schedule === '3x a week' || schedule === 'Weekly') {
    const target = frequencyTarget(schedule);
    let weekStart = getWeekRange(referenceDate).start;
    if (countWeekDone(completionDateKeys, weekStart) < target) {
      weekStart = addDays(weekStart, -7);
    }
    let streak = 0;
    while (countWeekDone(completionDateKeys, weekStart) >= target) {
      streak++;
      weekStart = addDays(weekStart, -7);
    }
    return streak;
  }

  let cursor = referenceDate;
  if (!completionDateKeys.has(toDateKey(referenceDate))) {
    cursor = addDays(referenceDate, -1);
  }
  let streak = 0;
  for (let i = 0; i < 365 * 3; i++) {
    if (!isHabitScheduledOn(schedule, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!completionDateKeys.has(toDateKey(cursor))) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeHeatmapDotState(
  habits: { id: string; targetFrequency: string }[],
  isCompleted: (habitId: string, dateKey: string) => boolean,
  dateKey: string,
  date: Date,
): HeatmapDotState {
  const scheduled = habits.filter((h) => isHabitScheduledOn(h.targetFrequency, date));
  if (scheduled.length === 0) return 'none';
  const allDone = scheduled.every((h) => isCompleted(h.id, dateKey));
  return allDone ? 'green' : 'red';
}
