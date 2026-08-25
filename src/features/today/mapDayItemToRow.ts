import type { IconName } from '@/domain/iconNames';
import type { DayItem } from '@/domain/dayItem';
import { ANY_TIME_HHMM } from '@/domain/time';
import { findHealthMetricOption } from '@/domain/healthMetrics';
import type { Leading, TimeMarker, Trailing } from '@/components/dayItem/DayItemRow';

export interface DayItemRowViewModel {
  id: string;
  timeMarker: TimeMarker;
  leading: Leading;
  title: string;
  trailing?: Trailing;
  hasLink: boolean;
  completed: boolean;
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

function leadingFor(item: DayItem, habitCompletedToday: boolean): Leading {
  switch (item.type) {
    case 'task':
      return { kind: 'checkbox', checked: item.status === 'done' };
    case 'event':
      return { kind: 'icon', name: 'calendar-today' as IconName };
    case 'voiceMemo':
      return { kind: 'icon', name: 'graphic-eq' as IconName };
    case 'note':
      return { kind: 'icon', name: 'sticky-note-2' as IconName };
    case 'moment':
      return { kind: 'icon', name: 'photo-camera' as IconName };
    case 'habit': {
      // El check de completar sigue siendo el mismo ícono genérico
      // (repeat/check) para CUALQUIER hábito — "de salud" (colorStyle
      // 'cool') solo suma un ícono chico aparte con la métrica elegida en
      // Auto-registro (footprints/bed/dumbbell/etc, ver
      // domain/healthMetrics.ts), nunca lo reemplaza, fiel a la referencia
      // del usuario.
      const healthIcon = item.colorStyle === 'cool' ? findHealthMetricOption(item.healthMetric)?.icon : undefined;
      return { kind: 'habitIcon', name: 'sync-alt' as IconName, completed: habitCompletedToday, healthIcon };
    }
  }
}

function trailingFor(item: DayItem): Trailing | undefined {
  if (item.type === 'voiceMemo') {
    return { kind: 'duration', label: formatDuration(item.durationSeconds) };
  }
  if (item.type === 'habit') {
    return item.colorStyle === 'cool' ? { kind: 'favorite' } : { kind: 'progress', label: item.progress };
  }
  return undefined;
}

/** `habitCompletedToday` solo aplica a hábitos — indica si ya se marcó hecho
 * el día que se está mostrando (no necesariamente "hoy" literal, ver
 * `dayItemsStore.selectedDateKey`). Se ignora para el resto de tipos. */
export function toRowViewModel(item: DayItem, habitCompletedToday = false): DayItemRowViewModel {
  return {
    id: item.id,
    timeMarker: timeMarkerFor(item),
    leading: leadingFor(item, habitCompletedToday),
    title: item.title,
    trailing: trailingFor(item),
    hasLink: item.type === 'task' && !!item.link,
    completed: item.status === 'done',
  };
}

/** Reordena para que los hábitos "de salud" (`colorStyle: 'cool'`, con Auto-
 * registro) queden al final de la lista, sin importar su hora — a pedido
 * explícito del usuario, replicando su referencia (Strength Training/10K
 * Steps/Watch Rings/7hr sleep agrupados abajo del todo). El resto de ítems
 * conserva su orden relativo (sort estable). */
export function sortWithHealthHabitsLast(items: DayItem[]): DayItem[] {
  const isHealthHabit = (item: DayItem) => item.type === 'habit' && item.colorStyle === 'cool';
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aWeight = isHealthHabit(a.item) ? 1 : 0;
      const bWeight = isHealthHabit(b.item) ? 1 : 0;
      if (aWeight !== bWeight) return aWeight - bWeight;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

/** Punto de partida (minutos desde medianoche) al empezar a arrastrar la hora de un ítem. */
export function initialDragMinutes(item: DayItem, nowMinutesValue: number): number {
  if (!item.reminderAt) return nowMinutesValue;
  const hhmm = item.reminderAt.slice(11, 16);
  if (hhmm === ANY_TIME_HHMM) return nowMinutesValue;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
