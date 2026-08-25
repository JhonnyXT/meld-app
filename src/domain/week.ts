import { addDays } from './date';
import { MONTH_SHORT, type Language } from '@/i18n/translations';

export interface WeekInfo {
  weekNumber: number;
  year: number;
  start: Date;
  end: Date;
  label: string;
}

/** Número de semana ISO-8601 (semanas de lunes a domingo, semana 1 contiene el primer jueves del año). */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const dow = (date.getDay() + 6) % 7; // 0 = lunes
  const start = addDays(date, -dow);
  const end = addDays(start, 6);
  return { start, end };
}

/** "Jul 27 – Aug 2" o "Jul 20 – 26" según si la semana cruza de mes. */
function formatWeekRangeLabel(start: Date, end: Date, lang: Language): string {
  const startLabel = `${MONTH_SHORT[lang][start.getMonth()]} ${start.getDate()}`;
  const endLabel =
    start.getMonth() === end.getMonth()
      ? `${end.getDate()}`
      : `${MONTH_SHORT[lang][end.getMonth()]} ${end.getDate()}`;
  return `${startLabel} – ${endLabel}`;
}

/** Últimas `count` semanas terminando en la semana que contiene `today`, de más reciente a más antigua. */
export function recentWeeks(today: Date, count: number, lang: Language = 'es'): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  for (let i = 0; i < count; i++) {
    const ref = addDays(today, -7 * i);
    const { start, end } = getWeekRange(ref);
    weeks.push({
      weekNumber: getISOWeek(start),
      year: start.getFullYear(),
      start,
      end,
      label: formatWeekRangeLabel(start, end, lang),
    });
  }
  return weeks;
}
