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

/** Tope de badges informativos a la derecha de la fila antes de "saturar"
 * (decisión de producto 2026-08-31: 2 badges + la acción). El mapper corta
 * acá; el orden de `trailingBadgesFor` define quién sobrevive. */
const MAX_TRAILING_BADGES = 2;

/** Categoría compacta para la fila: primera palabra, ~12 chars. La etiqueta
 * completa sigue visible/editable en el detalle del ítem. */
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

/** Un hábito se ve/agrupa como "cool" si tiene Auto-registro de salud
 * (`colorStyle: 'cool'`, persistido) O si el toggle global "Cool Habits" de
 * Settings está prendido — ese ajuste extiende el mismo look a CUALQUIER
 * hábito, no solo a los de salud (a pedido explícito, spec sección 4.5).
 * Apagado por default, así que sin el toggle el comportamiento es idéntico
 * al de antes. */
function isCoolHabit(item: DayItem, coolHabitsEnabled: boolean): boolean {
  return item.type === 'habit' && (item.colorStyle === 'cool' || coolHabitsEnabled);
}

function leadingFor(item: DayItem, habitCompletedToday: boolean, coolHabitsEnabled: boolean): Leading {
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
      // (repeat/check) para CUALQUIER hábito — "de salud" (o "cool" por el
      // toggle global) solo suma un ícono chico aparte con la métrica
      // elegida en Auto-registro (footprints/bed/dumbbell/etc, ver
      // domain/healthMetrics.ts, undefined si el hábito no tiene una
      // asignada), nunca lo reemplaza, fiel a la referencia del usuario.
      const healthIcon = isCoolHabit(item, coolHabitsEnabled) ? findHealthMetricOption(item.healthMetric)?.icon : undefined;
      return { kind: 'habitIcon', name: 'sync-alt' as IconName, completed: habitCompletedToday, healthIcon };
    }
  }
}

/** Badges del cluster derecho, EN ORDEN de precedencia (mayor primero), ya
 * recortados a `MAX_TRAILING_BADGES`. La acción (reproducir audio / abrir
 * link) NO va acá — la maneja `DayItemRow` aparte y siempre se muestra.
 *
 * Precedencia: prioridad (media/alta) › subtareas (reservado, aún sin
 * modelo) › recurrencia › progreso/❤ de hábito › categoría. La categoría es
 * la primera en caerse si hay más de dos. */
function trailingBadgesFor(item: DayItem, coolHabitsEnabled: boolean): TrailingBadge[] {
  const badges: TrailingBadge[] = [];

  // Rollover de tareas (ver `dayItemsStore.reload`) — máxima precedencia,
  // saber que algo quedó atrasado es lo primero que hay que ver.
  if (item.type === 'task' && item.status !== 'done' && item.date && item.date < toDateKey(new Date())) {
    badges.push({ kind: 'overdue' });
  }

  if (item.priority === 'medium' || item.priority === 'high') {
    badges.push({ kind: 'priority', level: item.priority });
  }

  // (subtareas: cuando exista el modelo, va acá — rank 2)

  if (item.type === 'task' && item.repeatRule) {
    badges.push({ kind: 'recurrence' });
  }

  if (item.type === 'habit') {
    badges.push(
      isCoolHabit(item, coolHabitsEnabled) ? { kind: 'favorite' } : { kind: 'habitProgress', label: item.progress },
    );
    // Racha real (≥ 2 — "🔥 1" es ruido). `currentStreak` viene recalculado
    // en memoria por `dayItemsStore.reload` para Today; en la agenda Semana
    // de Calendar puede ser el snapshot de la DB (misma limitación que
    // `progress`).
    if (item.currentStreak >= 2) {
      badges.push({ kind: 'streak', count: item.currentStreak });
    }
  }

  if (item.category && item.categoryColor) {
    badges.push({ kind: 'category', color: item.categoryColor, label: shortCategory(item.category) });
  }

  return badges.slice(0, MAX_TRAILING_BADGES);
}

/** `habitCompletedToday` solo aplica a hábitos — indica si ya se marcó hecho
 * el día que se está mostrando (no necesariamente "hoy" literal, ver
 * `dayItemsStore.selectedDateKey`). Se ignora para el resto de tipos.
 * `coolHabitsEnabled` viene de `settingsStore` (toggle "Cool Habits") — ver
 * `isCoolHabit`. */
export function toRowViewModel(item: DayItem, habitCompletedToday = false, coolHabitsEnabled = false): DayItemRowViewModel {
  return {
    id: item.id,
    timeMarker: timeMarkerFor(item),
    leading: leadingFor(item, habitCompletedToday, coolHabitsEnabled),
    title: item.title,
    trailing: trailingBadgesFor(item, coolHabitsEnabled),
    hasLink: (item.type === 'task' || item.type === 'event') && !!item.link,
    completed: item.status === 'done',
  };
}

/** Reordena para que los hábitos "cool" (de salud, o cualquiera si el
 * toggle global está prendido) queden al final de la lista, sin importar su
 * hora — a pedido explícito del usuario, replicando su referencia (Strength
 * Training/10K Steps/Watch Rings/7hr sleep agrupados abajo del todo). El
 * resto de ítems conserva su orden relativo (sort estable). */
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

/** Punto de partida (minutos desde medianoche) al empezar a arrastrar la hora de un ítem. */
export function initialDragMinutes(item: DayItem, nowMinutesValue: number): number {
  if (!item.reminderAt) return nowMinutesValue;
  const hhmm = item.reminderAt.slice(11, 16);
  if (hhmm === ANY_TIME_HHMM) return nowMinutesValue;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
