import type { IconName } from '@/domain/iconNames';
import type { DayItem } from '@/domain/dayItem';
import { ANY_TIME_HHMM } from '@/domain/time';
import { toDateKey } from '@/domain/date';
import { findHealthMetricOption } from '@/domain/healthMetrics';
import type { Leading, TimeMarker, TrailingBadge } from '@/components/dayItem/DayItemRow';

export interface DayItemRowViewModel {
  id: string;
  timeMarker: TimeMarker;
  leading: Leading;
  title: string;
  trailing: TrailingBadge[];
  hasLink: boolean;
  completed: boolean;
}

const MAX_TRAILING_BADGES = 2;

function shortCategory(label: string): string {
  const first = label.trim().split(/\s+/)[0] ?? label;
  return first.length > 12 ? `${first.slice(0, 11)}…` : first;
}

function parseTimeLabel(time: string): { hour: string; minute: string; meridiem: 'AM' | 'PM' } {
  const [h, m] = time.split(':').map(Number);
  const meridiem: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour: String(hour12), minute: String(m).padStart(2, '0'), meridiem };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timeMarkerFor(item: DayItem): TimeMarker {
  if (item.type === 'event') return { kind: 'time', ...parseTimeLabel(item.startTime) };
  if (!item.reminderAt) return { kind: 'dash' };
  const hhmm = item.reminderAt.slice(11, 16);
  if (hhmm === ANY_TIME_HHMM) return { kind: 'any' };
  return { kind: 'time', ...parseTimeLabel(hhmm) };
}

function isCoolHabit(item: DayItem, coolHabitsEnabled: boolean): boolean {
  return item.type === 'habit' && (item.colorStyle === 'cool' || coolHabitsEnabled);
}

function leadingFor(item: DayItem, habitCompletedToday: boolean, coolHabitsEnabled: boolean, taskCompletedToday: boolean): Leading {
  switch (item.type) {
    case 'task':
      return { kind: 'checkbox', checked: item.repeatRule ? taskCompletedToday : item.status === 'done' };
    case 'event':
      return { kind: 'icon', name: 'calendar-today' as IconName };
    case 'voiceMemo':
      return { kind: 'icon', name: 'graphic-eq' as IconName };
    case 'note':
      return { kind: 'icon', name: 'sticky-note-2' as IconName };
    case 'moment':
      return { kind: 'icon', name: 'photo-camera' as IconName };
    case 'habit': {
      const healthIcon = isCoolHabit(item, coolHabitsEnabled) ? findHealthMetricOption(item.healthMetric)?.icon : undefined;
      return { kind: 'habitIcon', name: 'sync-alt' as IconName, completed: habitCompletedToday, healthIcon };
    }
  }
}

function trailingBadgesFor(item: DayItem, coolHabitsEnabled: boolean, completedByName?: string): TrailingBadge[] {
  const badges: TrailingBadge[] = [];

  if (item.type === 'task' && !item.repeatRule && item.status !== 'done' && item.date && item.date < toDateKey(new Date())) {
    badges.push({ kind: 'overdue' });
  }

  if (item.priority === 'medium' || item.priority === 'high') {
    badges.push({ kind: 'priority', level: item.priority });
  }

  if (item.type === 'task' && item.repeatRule) {
    badges.push({ kind: 'recurrence' });
  }

  if (item.type === 'habit') {
    badges.push(
      isCoolHabit(item, coolHabitsEnabled) ? { kind: 'favorite' } : { kind: 'habitProgress', label: item.progress },
    );
    if (item.currentStreak >= 2) {
      badges.push({ kind: 'streak', count: item.currentStreak });
    }
  }

  if (item.category && item.categoryColor) {
    badges.push({ kind: 'category', color: item.categoryColor, label: shortCategory(item.category) });
  }

  if (completedByName) {
    badges.push({ kind: 'completedBy', name: completedByName });
  }

  return badges.slice(0, MAX_TRAILING_BADGES);
}

export function toRowViewModel(
  item: DayItem,
  habitCompletedToday = false,
  coolHabitsEnabled = false,
  taskCompletedToday = false,
  completedByName?: string,
): DayItemRowViewModel {
  return {
    id: item.id,
    timeMarker: timeMarkerFor(item),
    leading: leadingFor(item, habitCompletedToday, coolHabitsEnabled, taskCompletedToday),
    title: item.title,
    trailing: trailingBadgesFor(item, coolHabitsEnabled, completedByName),
    hasLink: (item.type === 'task' || item.type === 'event') && !!item.link,
    completed: item.type === 'task' && item.repeatRule ? taskCompletedToday : item.status === 'done',
  };
}

export function sortWithHealthHabitsLast(items: DayItem[], coolHabitsEnabled = false): DayItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aWeight = isCoolHabit(a.item, coolHabitsEnabled) ? 1 : 0;
      const bWeight = isCoolHabit(b.item, coolHabitsEnabled) ? 1 : 0;
      if (aWeight !== bWeight) return aWeight - bWeight;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function initialDragMinutes(item: DayItem, nowMinutesValue: number): number {
  if (!item.reminderAt) return nowMinutesValue;
  const hhmm = item.reminderAt.slice(11, 16);
  if (hhmm === ANY_TIME_HHMM) return nowMinutesValue;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
