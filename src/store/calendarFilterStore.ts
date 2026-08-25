import { create } from 'zustand';
import type { DayItem, DayItemType } from '@/domain/dayItem';

export type CalendarFilter =
  | { kind: 'everything' }
  | { kind: 'type'; itemType: Exclude<DayItemType, 'habit'> }
  | { kind: 'habit'; title: string };

interface CalendarFilterState {
  filter: CalendarFilter;
  sheetVisible: boolean;
  setFilter: (filter: CalendarFilter) => void;
  openSheet: () => void;
  closeSheet: () => void;
}

export const useCalendarFilterStore = create<CalendarFilterState>((set) => ({
  filter: { kind: 'everything' },
  sheetVisible: false,
  setFilter: (filter) => set({ filter, sheetVisible: false }),
  openSheet: () => set({ sheetVisible: true }),
  closeSheet: () => set({ sheetVisible: false }),
}));

export function matchesCalendarFilter(item: DayItem, filter: CalendarFilter): boolean {
  if (filter.kind === 'everything') return true;
  if (filter.kind === 'habit') return item.type === 'habit' && item.title === filter.title;
  return item.type === filter.itemType;
}
