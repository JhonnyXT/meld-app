import { WEEKDAY_SHORT, WEEKDAY_FULL, MONTH_SHORT, MONTH_FULL, type Language } from '@/i18n/translations';

export { MONTH_SHORT };

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatHeaderDate(date: Date, lang: Language = 'es'): string {
  const weekday = WEEKDAY_SHORT[lang][date.getDay()];
  const month = MONTH_SHORT[lang][date.getMonth()];
  return lang === 'es' ? `${weekday} ${date.getDate()} ${month}` : `${weekday} ${month} ${date.getDate()}`;
}

export function formatDayBarDate(date: Date, lang: Language = 'es'): string {
  return `${WEEKDAY_SHORT[lang][date.getDay()]} ${date.getDate()}`;
}

export function formatShortDateLabel(dateKey: string, lang: Language = 'es', now: Date = new Date()): string {
  if (dateKey === toDateKey(now)) return lang === 'es' ? 'Hoy' : 'Today';
  return formatHeaderDate(fromDateKey(dateKey), lang);
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatRelativeCreated(iso: string, lang: Language = 'es', now: Date = new Date()): string {
  const created = new Date(iso);
  const diffMs = now.getTime() - created.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (isSameCalendarDay(created, now)) {
    if (diffHours < 1) return lang === 'es' ? 'Ahora mismo' : 'Just now';
    return lang === 'es' ? `hace ${Math.floor(diffHours)}h` : `${Math.floor(diffHours)}h ago`;
  }

  const yesterday = addDays(now, -1);
  if (isSameCalendarDay(created, yesterday)) return lang === 'es' ? 'Ayer' : 'Yesterday';

  if (diffHours < 24 * 7) return WEEKDAY_SHORT[lang][created.getDay()];

  return `${MONTH_SHORT[lang][created.getMonth()]} ${created.getDate()}`;
}

export function formatMonthYearLabel(date: Date, lang: Language = 'es'): string {
  return `${MONTH_SHORT[lang][date.getMonth()]} ${date.getFullYear()}`;
}

export function formatFullMonthYear(date: Date, lang: Language = 'es'): string {
  return `${MONTH_FULL[lang][date.getMonth()]} ${date.getFullYear()}`;
}

export function formatLongDate(date: Date, lang: Language = 'es'): string {
  const weekday = WEEKDAY_FULL[lang][date.getDay()];
  const month = MONTH_FULL[lang][date.getMonth()];
  return lang === 'es'
    ? `${weekday}, ${date.getDate()} de ${month.toLowerCase()}`
    : `${weekday}, ${month} ${date.getDate()}`;
}
