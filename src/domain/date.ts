import { WEEKDAY_SHORT, MONTH_SHORT, MONTH_FULL, type Language } from '@/i18n/translations';

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

/** "Fri Jul 31" / "Vie 31 Jul" — usado en el header de Today. */
export function formatHeaderDate(date: Date, lang: Language = 'es'): string {
  const weekday = WEEKDAY_SHORT[lang][date.getDay()];
  const month = MONTH_SHORT[lang][date.getMonth()];
  return lang === 'es' ? `${weekday} ${date.getDate()} ${month}` : `${weekday} ${month} ${date.getDate()}`;
}

/** "Fri 31" — usado en la Day Bar. */
export function formatDayBarDate(date: Date, lang: Language = 'es'): string {
  return `${WEEKDAY_SHORT[lang][date.getDay()]} ${date.getDate()}`;
}

/** "Hoy" si `dateKey` es la fecha de hoy, si no "Vie 31 Jul" — usado en Búsqueda
 * y Próximos recordatorios, donde los resultados pueden ser de cualquier día. */
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

/** "2h ago" / "Yesterday" / "Mon" / "Jul 31" — usado en Inbox. */
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

/** "Jul 2026" — usado en Calendar (Day Bar). */
export function formatMonthYearLabel(date: Date, lang: Language = 'es'): string {
  return `${MONTH_SHORT[lang][date.getMonth()]} ${date.getFullYear()}`;
}

/** "July 2026" — usado en el header de Calendar (vista Month). */
export function formatFullMonthYear(date: Date, lang: Language = 'es'): string {
  return `${MONTH_FULL[lang][date.getMonth()]} ${date.getFullYear()}`;
}
