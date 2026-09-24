// Copia de `HEALTH_METRIC_OPTIONS` (`src/domain/healthMetrics.ts` de la app),
// solo que acá el ícono es directamente el componente de lucide-react en vez
// de un `IconName` semántico (la demo no tiene la capa de mapeo `Icon.tsx`).

import {
  Activity,
  Award,
  Bike,
  Dumbbell,
  Flame,
  Footprints,
  PersonStanding,
  Sunrise,
  Timer,
  TrendingUp,
  Watch,
  Waves,
  Zap,
  type LucideIcon,
  BedDouble,
} from 'lucide-react';

export type HealthMetricGroup = 'activity' | 'rings' | 'workouts';

export interface HealthMetricOption {
  id: string;
  group: HealthMetricGroup;
  icon: LucideIcon;
  /** Clave dentro de `DemoStrings['qa']['health']['metrics']`. */
  key: string;
  defaultTarget?: number;
  unitKey?: 'steps' | 'min' | 'cal' | 'hours';
  step?: number;
}

export const HEALTH_METRIC_OPTIONS: HealthMetricOption[] = [
  { id: 'steps', group: 'activity', icon: Footprints, key: 'steps', defaultTarget: 10000, unitKey: 'steps', step: 500 },
  { id: 'exerciseMinutes', group: 'activity', icon: Timer, key: 'exerciseMinutes', defaultTarget: 60, unitKey: 'min', step: 5 },
  { id: 'activeEnergy', group: 'activity', icon: Flame, key: 'activeEnergy', defaultTarget: 500, unitKey: 'cal', step: 50 },
  { id: 'sleep', group: 'activity', icon: BedDouble, key: 'sleep', defaultTarget: 8, unitKey: 'hours', step: 1 },

  { id: 'moveRingClosed', group: 'rings', icon: Zap, key: 'moveRing' },
  { id: 'exerciseRingClosed', group: 'rings', icon: Timer, key: 'exerciseRing' },
  { id: 'standRingClosed', group: 'rings', icon: Watch, key: 'standRing' },
  { id: 'allThreeRings', group: 'rings', icon: Award, key: 'allRings' },

  { id: 'anyWorkout', group: 'workouts', icon: Activity, key: 'anyWorkout' },
  { id: 'running', group: 'workouts', icon: TrendingUp, key: 'running' },
  { id: 'walking', group: 'workouts', icon: PersonStanding, key: 'walking' },
  { id: 'cycling', group: 'workouts', icon: Bike, key: 'cycling' },
  { id: 'strengthTraining', group: 'workouts', icon: Dumbbell, key: 'strengthTraining' },
  { id: 'swimming', group: 'workouts', icon: Waves, key: 'swimming' },
  { id: 'yoga', group: 'workouts', icon: Sunrise, key: 'yoga' },
];

export function findHealthMetricOption(id: string | null | undefined): HealthMetricOption | undefined {
  if (!id) return undefined;
  return HEALTH_METRIC_OPTIONS.find((o) => o.id === id);
}
