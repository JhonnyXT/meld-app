export type DayItemType = 'task' | 'event' | 'habit' | 'note' | 'voiceMemo' | 'moment';

export type DayItemStatus = 'inbox' | 'scheduled' | 'done';

export type PriorityLevel = 'none' | 'low' | 'medium' | 'high';

export interface DayItemBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  date: string | null;
  title: string;
  category: string | null;
  categoryColor: string | null;
  reminderAt: string | null;
  status: DayItemStatus;
  type: DayItemType;
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
  link: string | null;
  // ver docs/adr/0024-eventos-multi-dia.md
  endDate: string | null;
}

export type HabitColorStyle = 'default' | 'cool';

export interface Habit extends DayItemBase {
  type: 'habit';
  targetFrequency: string;
  currentStreak: number;
  progress: string;
  autoTrack: boolean;
  healthMetric: string | null;
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
