import type { Language } from '@/i18n/translations';

// ver docs/adr/0006-sentinel-any-time.md
export const ANY_TIME_HHMM = '24:00';
export const ANY_TIME_MINUTES = -1;

export function roundToStep(minutes: number, step: number): number {
  return Math.round(minutes / step) * step;
}

export function clampMinutes(minutes: number): number {
  return Math.max(0, Math.min(24 * 60 - 1, minutes));
}

export function nowMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function minutesToHour24(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function minutesTo12h(minutes: number): { hour: string; minute: string; meridiem: 'AM' | 'PM' } {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour: String(hour12), minute: String(m).padStart(2, '0'), meridiem };
}

export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${meridiem}`;
}

export function hour24ToMinutes(hour24: string): number {
  const [h, m] = hour24.split(':').map(Number);
  return h * 60 + m;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function minutesToDurationLabel(minutes: number, lang: Language = 'es'): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatDelta(deltaMinutes: number): string {
  const sign = deltaMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(deltaMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}
