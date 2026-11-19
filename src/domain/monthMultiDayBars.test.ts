import { buildMultiDayBars } from './monthMultiDayBars';
import { buildWeekRows } from './calendarGrid';
import type { Event } from './dayItem';

function event(overrides: Partial<Event> = {}): Event {
  const now = new Date().toISOString();
  return {
    id: 'e1',
    createdAt: now,
    updatedAt: now,
    date: '2026-11-17',
    title: 'Viaje',
    category: null,
    categoryColor: null,
    reminderAt: null,
    status: 'scheduled',
    type: 'event',
    priority: 'none',
    startTime: '09:00',
    endTime: '10:00',
    calendarSource: null,
    link: null,
    endDate: null,
    ...overrides,
  };
}

// Semana de referencia: lunes 2026-11-16 a domingo 2026-11-22 (índices 0-6).
const today = new Date('2026-11-18T12:00:00');
const [week] = buildWeekRows(today, 0, 0, today);

describe('buildMultiDayBars', () => {
  it('un evento de 3 días dentro de la semana ocupa las columnas correctas', () => {
    const e = event({ id: 'trip', date: '2026-11-17', endDate: '2026-11-19' });
    const { bars, laneCount } = buildMultiDayBars(week, {
      '2026-11-17': [e],
      '2026-11-18': [e],
      '2026-11-19': [e],
    });
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({ startCol: 1, endCol: 3, lane: 0 });
    expect(laneCount).toBe(1);
  });

  it('recorta el rango a los bordes de la semana si el evento empieza antes o termina después', () => {
    const e = event({ id: 'long', date: '2026-11-10', endDate: '2026-11-30' });
    const itemsByDate = Object.fromEntries(week.cells.map((c) => [c.dateKey, [e]]));
    const { bars } = buildMultiDayBars(week, itemsByDate);
    expect(bars[0]).toMatchObject({ startCol: 0, endCol: 6 });
  });

  it('dos eventos que se solapan en columnas van a carriles distintos', () => {
    const a = event({ id: 'a', date: '2026-11-16', endDate: '2026-11-18' });
    const b = event({ id: 'b', date: '2026-11-17', endDate: '2026-11-19' });
    const itemsByDate = {
      '2026-11-16': [a],
      '2026-11-17': [a, b],
      '2026-11-18': [a, b],
      '2026-11-19': [b],
    };
    const { bars, laneCount } = buildMultiDayBars(week, itemsByDate);
    expect(laneCount).toBe(2);
    const laneOf = (id: string) => bars.find((bar) => bar.item.id === id)?.lane;
    expect(laneOf('a')).not.toBe(laneOf('b'));
  });

  it('dos eventos que NO se solapan comparten el mismo carril', () => {
    const a = event({ id: 'a', date: '2026-11-16', endDate: '2026-11-17' });
    const b = event({ id: 'b', date: '2026-11-18', endDate: '2026-11-19' });
    const itemsByDate = {
      '2026-11-16': [a],
      '2026-11-17': [a],
      '2026-11-18': [b],
      '2026-11-19': [b],
    };
    const { bars, laneCount } = buildMultiDayBars(week, itemsByDate);
    expect(laneCount).toBe(1);
    expect(bars[0].lane).toBe(0);
    expect(bars[1].lane).toBe(0);
  });

  it('ignora eventos de un solo día (endDate null)', () => {
    const e = event({ id: 'single', date: '2026-11-17', endDate: null });
    const { bars, laneCount } = buildMultiDayBars(week, { '2026-11-17': [e] });
    expect(bars).toHaveLength(0);
    expect(laneCount).toBe(0);
  });
});
