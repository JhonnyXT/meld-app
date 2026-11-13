import { isTaskScheduledOn } from './task';
import { fromDateKey } from './date';

describe('isTaskScheduledOn', () => {
  it('nunca recurre antes de la fecha ancla', () => {
    const anchor = fromDateKey('2026-11-09');
    const before = fromDateKey('2026-11-08');
    expect(isTaskScheduledOn('Daily', anchor, before)).toBe(false);
  });

  it('"Daily" recurre todos los días desde la fecha ancla', () => {
    const anchor = fromDateKey('2026-11-09');
    expect(isTaskScheduledOn('Daily', anchor, fromDateKey('2026-11-09'))).toBe(true);
    expect(isTaskScheduledOn('Daily', anchor, fromDateKey('2026-12-25'))).toBe(true);
  });

  it('"Weekly" solo recurre el mismo día de la semana que la fecha ancla', () => {
    const anchor = fromDateKey('2026-11-09'); // lunes
    expect(isTaskScheduledOn('Weekly', anchor, fromDateKey('2026-11-16'))).toBe(true); // lunes siguiente
    expect(isTaskScheduledOn('Weekly', anchor, fromDateKey('2026-11-17'))).toBe(false); // martes
  });

  it('"Monthly" solo recurre el mismo día del mes, nunca se corre al último día disponible', () => {
    const anchor = fromDateKey('2026-01-31');
    expect(isTaskScheduledOn('Monthly', anchor, fromDateKey('2026-03-31'))).toBe(true);
    expect(isTaskScheduledOn('Monthly', anchor, fromDateKey('2026-02-28'))).toBe(false);
  });

  it('un repeatRule desconocido no recurre', () => {
    const anchor = fromDateKey('2026-11-09');
    expect(isTaskScheduledOn('Never', anchor, fromDateKey('2026-11-16'))).toBe(false);
  });
});
