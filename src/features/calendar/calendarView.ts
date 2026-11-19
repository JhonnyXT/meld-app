export type CalendarView = 'week' | 'month' | 'year';

export const CALENDAR_VIEW_ORDER: CalendarView[] = ['month', 'week', 'year'];

// De más abarcador/menos detalle a menos abarcador/más detalle — ver docs/adr/0023-zoom-calendario.md
export const CALENDAR_ZOOM_ORDER: CalendarView[] = ['year', 'month', 'week'];
