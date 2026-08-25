import { addDays, toDateKey } from './date';
import { getWeekRange } from './week';
import { frequencyTarget } from './quickAdd';
import type { HeatmapDotState } from './calendarHeatmap';

/**
 * ¿Corresponde este hábito el día `date` según su frecuencia? Determina si
 * aparece en Today ese día y si cuenta en el cálculo de racha diaria.
 * "Weekdays" se salta sábado/domingo; el resto de frecuencias (Every day,
 * 3x a week, Weekly) se ofrecen todos los días — el usuario elige en cuáles
 * completar el objetivo semanal, no hay un día fijo asignado.
 */
export function isHabitScheduledOn(schedule: string, date: Date): boolean {
  if (schedule === 'Weekdays') {
    const dow = date.getDay(); // 0 domingo, 6 sábado
    return dow !== 0 && dow !== 6;
  }
  return true;
}

function countWeekDone(completionDateKeys: ReadonlySet<string>, weekStart: Date): number {
  let done = 0;
  for (let i = 0; i < 7; i++) {
    if (completionDateKeys.has(toDateKey(addDays(weekStart, i)))) done++;
  }
  return done;
}

/** "x/y" de la semana (lunes-domingo) que contiene `referenceDate`. */
export function computeWeekProgress(
  schedule: string,
  completionDateKeys: ReadonlySet<string>,
  referenceDate: Date,
): string {
  const { start } = getWeekRange(referenceDate);
  const target = frequencyTarget(schedule);
  const done = countWeekDone(completionDateKeys, start);
  return `${Math.min(done, target)}/${target}`;
}

/**
 * Racha del hábito a partir de `referenceDate`:
 * - "Every day"/"Weekdays" (objetivo diario): días programados consecutivos
 *   completados, contando hacia atrás desde hoy — si hoy todavía no se marcó,
 *   arranca desde ayer para no "romper" la racha antes de que termine el día.
 * - "3x a week"/"Weekly" (objetivo semanal): semanas consecutivas donde se
 *   llegó al target, contando hacia atrás desde la semana actual — si la
 *   semana actual todavía no llegó al target, arranca desde la anterior por
 *   la misma razón (semana en curso, todavía se puede completar).
 */
export function computeStreak(
  schedule: string,
  completionDateKeys: ReadonlySet<string>,
  referenceDate: Date,
): number {
  if (schedule === '3x a week' || schedule === 'Weekly') {
    const target = frequencyTarget(schedule);
    let weekStart = getWeekRange(referenceDate).start;
    if (countWeekDone(completionDateKeys, weekStart) < target) {
      weekStart = addDays(weekStart, -7);
    }
    let streak = 0;
    while (countWeekDone(completionDateKeys, weekStart) >= target) {
      streak++;
      weekStart = addDays(weekStart, -7);
    }
    return streak;
  }

  let cursor = referenceDate;
  if (!completionDateKeys.has(toDateKey(referenceDate))) {
    cursor = addDays(referenceDate, -1);
  }
  let streak = 0;
  // Tope de seguridad (3 años) para no loopear indefinido ante datos inválidos.
  for (let i = 0; i < 365 * 3; i++) {
    if (!isHabitScheduledOn(schedule, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!completionDateKeys.has(toDateKey(cursor))) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Estado del heatmap de Calendar > Año para un día, agregando entre los
 * hábitos en `habits` (uno solo si el usuario filtró por un hábito
 * específico, o todos para la vista sin filtrar). `'green'` = todos los
 * hábitos programados ese día se completaron, `'red'` = al menos uno
 * programado ese día no se completó, `'none'` = ningún hábito programado.
 */
export function computeHeatmapDotState(
  habits: { id: string; targetFrequency: string }[],
  isCompleted: (habitId: string, dateKey: string) => boolean,
  dateKey: string,
  date: Date,
): HeatmapDotState {
  const scheduled = habits.filter((h) => isHabitScheduledOn(h.targetFrequency, date));
  if (scheduled.length === 0) return 'none';
  const allDone = scheduled.every((h) => isCompleted(h.id, dateKey));
  return allDone ? 'green' : 'red';
}
