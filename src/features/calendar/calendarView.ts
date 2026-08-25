export type CalendarView = 'week' | 'month' | 'year';

/** Orden real de las 3 vistas (mismo orden que `CalendarViewSwitch`) — usado
 * también por el gesto de swipe horizontal entre vistas en `CalendarScreen`. */
export const CALENDAR_VIEW_ORDER: CalendarView[] = ['month', 'week', 'year'];
