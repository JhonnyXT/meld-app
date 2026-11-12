import type { Language } from '@/i18n/translations';

export type HeatmapDotState = 'none' | 'green' | 'red';

export interface MonthHeatmap {
  monthIndex: number;
  dots: HeatmapDotState[];
  activeDaysLabel: string;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function buildMonthHeatmap(
  year: number,
  monthIndex: number,
  today: Date,
  dayState: (dateKey: string, date: Date) => HeatmapDotState,
  lang: Language = 'es',
): MonthHeatmap {
  const totalDays = daysInMonth(year, monthIndex);
  const isFutureMonth = year === today.getFullYear() ? monthIndex > today.getMonth() : year > today.getFullYear();
  const isCurrentMonth = year === today.getFullYear() && monthIndex === today.getMonth();
  const lastElapsedDay = isCurrentMonth ? today.getDate() : totalDays;

  const leadDays = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const dots: HeatmapDotState[] = Array.from({ length: leadDays }, () => 'none');
  let activeDays = 0;

  for (let day = 1; day <= totalDays; day++) {
    const elapsed = !isFutureMonth && day <= lastElapsedDay;
    const date = new Date(year, monthIndex, day);
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const state = elapsed ? dayState(dateKey, date) : 'none';
    if (state !== 'none') activeDays++;
    dots.push(state);
  }

  const remainder = dots.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) dots.push('none');
  }

  return {
    monthIndex,
    dots,
    activeDaysLabel: isFutureMonth ? '' : lang === 'es' ? `${activeDays} ítems` : `${activeDays} items`,
  };
}
