import type { DayItem } from './dayItem';
import type { WeekRow } from './calendarGrid';

export interface MultiDayBar {
  item: DayItem;
  startCol: number;
  endCol: number;
  lane: number;
}

// ver docs/adr/0028-barra-continua-multi-dia.md
export function buildMultiDayBars(
  week: WeekRow,
  itemsByDate: Record<string, DayItem[]>,
): { bars: MultiDayBar[]; laneCount: number } {
  const weekStartKey = week.cells[0].dateKey;
  const weekEndKey = week.cells[6].dateKey;
  const seen = new Set<string>();
  const candidates: { item: DayItem; startCol: number; endCol: number }[] = [];

  for (const cell of week.cells) {
    for (const item of itemsByDate[cell.dateKey] ?? []) {
      if (item.type !== 'event' || !item.endDate || !item.date || seen.has(item.id)) continue;
      seen.add(item.id);
      const start = item.date < weekStartKey ? weekStartKey : item.date;
      const end = item.endDate > weekEndKey ? weekEndKey : item.endDate;
      const startCol = week.cells.findIndex((c) => c.dateKey === start);
      const endCol = week.cells.findIndex((c) => c.dateKey === end);
      if (startCol === -1 || endCol === -1) continue;
      candidates.push({ item, startCol, endCol });
    }
  }

  // Empaquetado simple en "carriles": cada candidato va al primer carril cuyo
  // último ítem termina antes de que este empiece (mismo criterio que un
  // scheduler de intervalos clásico — alcanza porque hay pocos multi-día a la vez).
  candidates.sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol);
  const laneEnds: number[] = [];
  const bars: MultiDayBar[] = [];
  for (const c of candidates) {
    let lane = laneEnds.findIndex((end) => end < c.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(c.endCol);
    } else {
      laneEnds[lane] = c.endCol;
    }
    bars.push({ ...c, lane });
  }

  return { bars, laneCount: laneEnds.length };
}
