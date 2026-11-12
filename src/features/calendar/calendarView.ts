export type CalendarView = 'week' | 'month' | 'year';

/** Orden real de las 3 vistas — usado por `SegmentedToggle` y también por el
 * gesto de swipe horizontal entre vistas en `CalendarScreen`. */
export const CALENDAR_VIEW_ORDER: CalendarView[] = ['month', 'week', 'year'];
