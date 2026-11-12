import { daysInMonth } from './calendarHeatmap';
import { toDateKey, addDays } from './date';

export interface MonthGridCell {
  date: Date;
  dateKey: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export function buildMonthGrid(year: number, monthIndex: number, today: Date): MonthGridCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const leadDays = (firstOfMonth.getDay() + 6) % 7;
  const totalDays = daysInMonth(year, monthIndex);
  const totalCells = Math.ceil((leadDays + totalDays) / 7) * 7;
  const gridStart = addDays(firstOfMonth, -leadDays);
  const todayKey = toDateKey(today);

  return Array.from({ length: totalCells }, (_, i) => {
    const date = addDays(gridStart, i);
    const dow = (date.getDay() + 6) % 7;
    return {
      date,
      dateKey: toDateKey(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === monthIndex,
      isToday: toDateKey(date) === todayKey,
      isWeekend: dow === 5 || dow === 6,
    };
  });
}
