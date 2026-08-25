export type DayItemType = 'task' | 'event' | 'habit' | 'note' | 'voiceMemo' | 'moment';

export type DayItemStatus = 'inbox' | 'scheduled' | 'done';

export type PriorityLevel = 'none' | 'low' | 'medium' | 'high';

export interface DayItemBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Día al que pertenece. Null mientras el ítem vive en el Inbox. */
  date: string | null;
  title: string;
  category: string | null;
  categoryColor: string | null;
  /** Cualquier ítem, sin importar su tipo, puede tener un recordatorio. */
  reminderAt: string | null;
  status: DayItemStatus;
  type: DayItemType;
  /** Nivel de prioridad, aplica a cualquier tipo de ítem (Quick Add lo muestra siempre). */
  priority: PriorityLevel;
}

export interface Task extends DayItemBase {
  type: 'task';
  repeatRule: string | null;
  link: string | null;
}

export interface Event extends DayItemBase {
  type: 'event';
  startTime: string;
  endTime: string;
  calendarSource: string | null;
}

export type HabitColorStyle = 'default' | 'cool';

export interface Habit extends DayItemBase {
  type: 'habit';
  targetFrequency: string;
  currentStreak: number;
  progress: string;
  /** `true` cuando el hábito tiene una métrica de Auto-registro elegida
   * (`healthMetric !== null`, ver `domain/healthMetrics.ts`). HOY esto es
   * puramente informativo/visual (ícono de la métrica + corazón) — el check
   * de "hecho" sigue siendo 100% manual, sin importar este valor. ROADMAP
   * Pro (no implementado): con Apple Health/Google Fit conectados, el check
   * se marcaría solo apenas la app detecte que se cumplió la meta ahí —
   * lectura on-device, read-only; el check manual seguiría existiendo y
   * "ganando" siempre (se puede corregir a mano aunque Health diga otra
   * cosa). Ver `autoTrackProNote` en `i18n/translations.ts` (texto real que
   * ve el usuario en el modal) y CLAUDE.md → "## Roadmap Pro" (junta TODO
   * lo pendiente de plan Pro en un solo lugar). */
  autoTrack: boolean;
  /** id de `HEALTH_METRIC_OPTIONS` (`domain/healthMetrics.ts`), o null si el
   * hábito no tiene Auto-registro (se marca a mano). */
  healthMetric: string | null;
  /** Solo aplica a las métricas de "Actividad" (Steps/Exercise minutes/
   * Active energy/Sleep) — null para Anillos/Entrenamientos. */
  healthMetricTarget: number | null;
  colorStyle: HabitColorStyle;
}

export interface Note extends DayItemBase {
  type: 'note';
  richTextBody: string;
}

export interface VoiceMemo extends DayItemBase {
  type: 'voiceMemo';
  audioFileUri: string;
  durationSeconds: number;
}

export interface Moment extends DayItemBase {
  type: 'moment';
  mediaUri: string;
  weekOfYear: number;
}

export type DayItem = Task | Event | Habit | Note | VoiceMemo | Moment;
