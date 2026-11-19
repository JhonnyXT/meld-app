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

export interface WeekRow {
  key: string;
  cells: MonthGridCell[];
}

function mondayOf(date: Date): Date {
  const dow = (date.getDay() + 6) % 7;
  return addDays(date, -dow);
}

// ver docs/adr/0025-calendario-scroll-continuo.md
export function buildWeekRows(centerDate: Date, weeksBack: number, weeksForward: number, today: Date): WeekRow[] {
  const startMonday = addDays(mondayOf(centerDate), -weeksBack * 7);
  const todayKey = toDateKey(today);
  const totalWeeks = weeksBack + weeksForward + 1;

  return Array.from({ length: totalWeeks }, (_, w) => {
    const weekStart = addDays(startMonday, w * 7);
    const cells = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dow = (date.getDay() + 6) % 7;
      return {
        date,
        dateKey: toDateKey(date),
        day: date.getDate(),
        inCurrentMonth: true,
        isToday: toDateKey(date) === todayKey,
        isWeekend: dow === 5 || dow === 6,
      };
    });
    return { key: toDateKey(weekStart), cells };
  });
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
