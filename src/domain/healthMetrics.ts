import type { IconName } from './iconNames';
import type { TranslationKey } from '@/i18n';

export type HealthMetricGroup = 'activity' | 'rings' | 'workouts';

export interface HealthMetricOption {
  /** Valor interno, SIEMPRE en inglés (se persiste tal cual en
   * `Habit.healthMetric`, mismo criterio que `REPEAT_OPTIONS`/
   * `HABIT_SCHEDULE_OPTIONS` en `domain/quickAdd.ts`) — lo que se traduce es
   * solo `labelKey`. */
  id: string;
  group: HealthMetricGroup;
  icon: IconName;
  labelKey: TranslationKey;
  /** Solo las 4 métricas de "Actividad" tienen un objetivo numérico
   * ajustable (stepper +/- en el modal) — Anillos y Entrenamientos son
   * binarios (cerrado/no cerrado, hecho/no hecho), sin target. */
  defaultTarget?: number;
  unitKey?: TranslationKey;
  step?: number;
}

export const HEALTH_METRIC_OPTIONS: HealthMetricOption[] = [
  { id: 'steps', group: 'activity', icon: 'footprints', labelKey: 'healthMetricSteps', defaultTarget: 10000, unitKey: 'healthUnitSteps', step: 500 },
  { id: 'exerciseMinutes', group: 'activity', icon: 'timer', labelKey: 'healthMetricExerciseMinutes', defaultTarget: 60, unitKey: 'healthUnitMin', step: 5 },
  { id: 'activeEnergy', group: 'activity', icon: 'flame', labelKey: 'healthMetricActiveEnergy', defaultTarget: 500, unitKey: 'healthUnitCal', step: 50 },
  { id: 'sleep', group: 'activity', icon: 'bed', labelKey: 'healthMetricSleep', defaultTarget: 8, unitKey: 'healthUnitHours', step: 1 },

  { id: 'moveRingClosed', group: 'rings', icon: 'zap', labelKey: 'healthMetricMoveRing' },
  { id: 'exerciseRingClosed', group: 'rings', icon: 'timer', labelKey: 'healthMetricExerciseRing' },
  { id: 'standRingClosed', group: 'rings', icon: 'watch', labelKey: 'healthMetricStandRing' },
  { id: 'allThreeRings', group: 'rings', icon: 'award', labelKey: 'healthMetricAllRings' },

  { id: 'anyWorkout', group: 'workouts', icon: 'activity', labelKey: 'healthMetricAnyWorkout' },
  { id: 'running', group: 'workouts', icon: 'trending-up', labelKey: 'healthMetricRunning' },
  { id: 'walking', group: 'workouts', icon: 'person-standing', labelKey: 'healthMetricWalking' },
  { id: 'cycling', group: 'workouts', icon: 'bike', labelKey: 'healthMetricCycling' },
  { id: 'strengthTraining', group: 'workouts', icon: 'dumbbell', labelKey: 'healthMetricStrengthTraining' },
  { id: 'swimming', group: 'workouts', icon: 'waves-horizontal', labelKey: 'healthMetricSwimming' },
  { id: 'yoga', group: 'workouts', icon: 'sunrise', labelKey: 'healthMetricYoga' },
];

export function findHealthMetricOption(id: string | null | undefined): HealthMetricOption | undefined {
  if (!id) return undefined;
  return HEALTH_METRIC_OPTIONS.find((o) => o.id === id);
}
