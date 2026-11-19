import { hour24ToMinutes, ANY_TIME_HHMM } from './time';
import type { DayItem } from './dayItem';

export interface TimedBlock {
  item: DayItem;
  startMinutes: number;
  durationMinutes: number;
}

const DEFAULT_BLOCK_MINUTES = 30;
const MIN_EVENT_MINUTES = 20;

// ver docs/adr/0026-semana-grilla-horaria.md
export function timeRangeFor(item: DayItem): { startMinutes: number; durationMinutes: number } | null {
  if (item.type === 'event') {
    const start = hour24ToMinutes(item.startTime);
    const end = hour24ToMinutes(item.endTime);
    return { startMinutes: start, durationMinutes: Math.max(end - start, MIN_EVENT_MINUTES) };
  }
  if (!item.reminderAt) return null;
  const hhmm = item.reminderAt.slice(11, 16);
  if (hhmm === ANY_TIME_HHMM) return null;
  return { startMinutes: hour24ToMinutes(hhmm), durationMinutes: DEFAULT_BLOCK_MINUTES };
}

export function splitTimedAndUntimed(items: DayItem[]): { timed: TimedBlock[]; untimed: DayItem[] } {
  const timed: TimedBlock[] = [];
  const untimed: DayItem[] = [];
  for (const item of items) {
    const range = timeRangeFor(item);
    if (range) timed.push({ item, ...range });
    else untimed.push(item);
  }
  return { timed, untimed };
}
