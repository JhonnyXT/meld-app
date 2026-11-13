import { computeHeatmapDotState, computeStreak, computeWeekProgress, isHabitScheduledOn } from './habit';
import { fromDateKey, toDateKey } from './date';

describe('isHabitScheduledOn', () => {
  it('"Weekdays" se salta sábado y domingo', () => {
    const monday = fromDateKey('2026-11-09');
    const saturday = fromDateKey('2026-11-14');
    const sunday = fromDateKey('2026-11-15');
    expect(isHabitScheduledOn('Weekdays', monday)).toBe(true);
    expect(isHabitScheduledOn('Weekdays', saturday)).toBe(false);
    expect(isHabitScheduledOn('Weekdays', sunday)).toBe(false);
  });

  it('el resto de frecuencias se ofrece todos los días', () => {
    const sunday = fromDateKey('2026-11-15');
    expect(isHabitScheduledOn('Every day', sunday)).toBe(true);
    expect(isHabitScheduledOn('3x a week', sunday)).toBe(true);
    expect(isHabitScheduledOn('Weekly', sunday)).toBe(true);
  });
});

describe('computeWeekProgress', () => {
  it('cuenta los días completados dentro de la semana (lunes-domingo) de referencia', () => {
    const monday = fromDateKey('2026-11-09');
    const done = new Set(['2026-11-09', '2026-11-10', '2026-11-20']); // el último, otra semana
    expect(computeWeekProgress('3x a week', done, monday)).toBe('2/3');
  });

  it('nunca pasa del target aunque se complete más seguido', () => {
    const monday = fromDateKey('2026-11-09');
    const done = new Set(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
    expect(computeWeekProgress('3x a week', done, monday)).toBe('3/3');
  });
});

describe('computeStreak', () => {
  it('hábito diario: cuenta hacia atrás desde ayer si hoy todavía no se marcó', () => {
    const today = fromDateKey('2026-11-12');
    const done = new Set(['2026-11-11', '2026-11-10', '2026-11-09']);
    expect(computeStreak('Every day', done, today)).toBe(3);
  });

  it('hábito diario: si hoy ya se marcó, cuenta desde hoy', () => {
    const today = fromDateKey('2026-11-12');
    const done = new Set(['2026-11-12', '2026-11-11']);
    expect(computeStreak('Every day', done, today)).toBe(2);
  });

  it('"Weekdays": un fin de semana sin marcar no rompe la racha', () => {
    const monday = fromDateKey('2026-11-16');
    const done = new Set(['2026-11-16', '2026-11-13']);
    expect(computeStreak('Weekdays', done, monday)).toBe(2);
  });

  it('objetivo semanal: semanas consecutivas con el target cumplido', () => {
    const thisMonday = fromDateKey('2026-11-09');
    const lastMonday = fromDateKey('2026-11-02');
    const done = new Set([
      toDateKey(thisMonday),
      toDateKey(fromDateKey('2026-11-10')),
      toDateKey(fromDateKey('2026-11-11')),
      toDateKey(lastMonday),
      toDateKey(fromDateKey('2026-11-03')),
      toDateKey(fromDateKey('2026-11-04')),
    ]);
    expect(computeStreak('3x a week', done, thisMonday)).toBe(2);
  });

  it('objetivo semanal: la semana en curso sin completar todavía no rompe la racha pasada', () => {
    const thisMonday = fromDateKey('2026-11-09');
    const lastMonday = fromDateKey('2026-11-02');
    const done = new Set([toDateKey(lastMonday), toDateKey(fromDateKey('2026-11-03')), toDateKey(fromDateKey('2026-11-04'))]);
    expect(computeStreak('3x a week', done, thisMonday)).toBe(1);
  });
});

describe('computeHeatmapDotState', () => {
  const isCompleted = (done: Set<string>) => (habitId: string, dateKey: string) => done.has(`${habitId}:${dateKey}`);

  it('"none" cuando ningún hábito está programado ese día', () => {
    const sunday = fromDateKey('2026-11-15');
    const habits = [{ id: 'h1', targetFrequency: 'Weekdays' }];
    expect(computeHeatmapDotState(habits, isCompleted(new Set()), '2026-11-15', sunday)).toBe('none');
  });

  it('"green" cuando todos los hábitos programados se completaron', () => {
    const monday = fromDateKey('2026-11-09');
    const habits = [{ id: 'h1', targetFrequency: 'Every day' }, { id: 'h2', targetFrequency: 'Every day' }];
    const done = new Set(['h1:2026-11-09', 'h2:2026-11-09']);
    expect(computeHeatmapDotState(habits, isCompleted(done), '2026-11-09', monday)).toBe('green');
  });

  it('"red" cuando al menos uno programado no se completó', () => {
    const monday = fromDateKey('2026-11-09');
    const habits = [{ id: 'h1', targetFrequency: 'Every day' }, { id: 'h2', targetFrequency: 'Every day' }];
    const done = new Set(['h1:2026-11-09']);
    expect(computeHeatmapDotState(habits, isCompleted(done), '2026-11-09', monday)).toBe('red');
  });
});
