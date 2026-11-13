import { dayItemRepository } from '@/data/local/dayItemRepository';
import { toDateKey } from '@/domain/date';
import { ANY_TIME_HHMM } from '@/domain/time';
import type { DayItem } from '@/domain/dayItem';

export interface WidgetItemRow {
  id: string;
  title: string;
  timeLabel: string;
  type: DayItem['type'];
}

export interface TodayWidgetData {
  dateKey: string;
  items: WidgetItemRow[];
  doneCount: number;
  totalCount: number;
}

const MAX_WIDGET_ITEMS = 12;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function format12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${meridiem}`;
}

function minutesOf(item: DayItem): number | null {
  if (item.type === 'event') return toMinutes(item.startTime);
  if (item.reminderAt) {
    const hhmm = item.reminderAt.slice(11, 16);
    if (hhmm !== ANY_TIME_HHMM) return toMinutes(hhmm);
  }
  return null;
}

function timeLabelFor(item: DayItem): string {
  const minutes = minutesOf(item);
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return format12h(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
}

export async function getTodayWidgetData(): Promise<TodayWidgetData> {
  const dateKey = toDateKey(new Date());
  const items = await dayItemRepository.listByDate(dateKey);
  const pending = items.filter((i) => i.status !== 'done');
  const sorted = [...pending].sort((a, b) => {
    const ma = minutesOf(a);
    const mb = minutesOf(b);
    if (ma === null && mb === null) return 0;
    if (ma === null) return 1;
    if (mb === null) return -1;
    return ma - mb;
  });
  return {
    dateKey,
    items: sorted
      .slice(0, MAX_WIDGET_ITEMS)
      .map((i) => ({ id: i.id, title: i.title, timeLabel: timeLabelFor(i), type: i.type })),
    doneCount: items.length - pending.length,
    totalCount: items.length,
  };
}
