import type { Language } from '@/i18n/translations';

/**
 * Sentinel de "recordatorio sin hora específica" (Any Time) para el campo
 * `HH:MM` de `reminderAt`. Es "24:00" y no "00:00" a propósito: el
 * wheel-picker de hora nunca puede producir 24:00 (solo cubre 00:00-23:59),
 * así que no colisiona con una medianoche real elegida por el usuario — antes,
 * usar "00:00" como sentinel hacía que un recordatorio puesto a las 12:00 AM
 * se interpretara como "Any Time" y JAMÁS disparara su notificación real.
 */
export const ANY_TIME_HHMM = '24:00';

/**
 * Sentinel de "Any Time" para el `minutes: number | null` que manejan
 * `TimeFieldRow`/`WheelTimePicker` en memoria (Quick Add e ItemDetailSheet)
 * antes de convertirse a `reminderAt`. `null` sigue significando "Apagado, sin
 * recordatorio"; `-1` (fuera del rango real 0-1439) es la tercera opción
 * elegible a propósito: "recordarme, pero sin hora específica".
 */
export const ANY_TIME_MINUTES = -1;

/** Minutos desde medianoche, redondeados al múltiplo de `step` más cercano. */
export function roundToStep(minutes: number, step: number): number {
  return Math.round(minutes / step) * step;
}

export function clampMinutes(minutes: number): number {
  return Math.max(0, Math.min(24 * 60 - 1, minutes));
}

export function nowMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** minutos -> "HH:MM" 24h, para persistir en reminderAt. */
export function minutesToHour24(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** minutos -> hora 12h partida en hour/minute/meridiem, para pills y time markers. */
export function minutesTo12h(minutes: number): { hour: string; minute: string; meridiem: 'AM' | 'PM' } {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour: String(hour12), minute: String(m).padStart(2, '0'), meridiem };
}

/** minutos -> "11:15 AM", para mostrar en la barra de confirmación. */
export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${meridiem}`;
}

/** "HH:MM" 24h -> minutos desde medianoche. */
export function hour24ToMinutes(hour24: string): number {
  const [h, m] = hour24.split(':').map(Number);
  return h * 60 + m;
}

/** minutos de duración (no hora del día) -> "1 h 30 min" / "45 min" / "2 h". */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function minutesToDurationLabel(minutes: number, lang: Language = 'es'): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** delta en minutos -> "+1h 15m" / "-45m" / "+2h". */
export function formatDelta(deltaMinutes: number): string {
  const sign = deltaMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(deltaMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}
