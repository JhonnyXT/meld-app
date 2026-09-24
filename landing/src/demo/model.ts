// Modelo de la demo interactiva de la pantalla Hoy. Es una versión reducida
// del `DayItem` de la app (`src/domain/dayItem.ts`), solo en memoria: al
// recargar la página vuelve a los ítems de ejemplo (decisión explícita).

export type Language = 'es' | 'en';
export type PriorityLevel = 'none' | 'low' | 'medium' | 'high';
export type ItemType = 'task' | 'event' | 'habit' | 'note' | 'voiceMemo';
export type CategoryId = 'Work' | 'Personal' | 'Health';
export type HabitSchedule = 'Every day' | 'Weekdays' | '3x a week' | 'Weekly';
export type HabitPreferredTime = 'Anytime' | 'Morning' | 'Afternoon' | 'Evening';
export type RepeatOption = 'Never' | 'Daily' | 'Weekly' | 'Monthly';
export type EarlyAlert = 'Off' | '10 min before' | '30 min before' | '1 hr before';

/** Mismos valores canónicos (en inglés) que la app; lo traducido es la etiqueta. */
export const QUICK_ADD_CATEGORIES: { label: CategoryId; color: string }[] = [
  { label: 'Work', color: '#4F84FF' },
  { label: 'Personal', color: '#A55CFF' },
  { label: 'Health', color: '#5dde97' },
];
export const CATEGORY_COLOR: Record<CategoryId, string> = { Work: '#4F84FF', Personal: '#A55CFF', Health: '#5dde97' };
export const PRIORITY_COLOR: Record<PriorityLevel, string> = { none: '#8E8E93', low: '#4F9DDE', medium: '#F2A93B', high: '#E5484D' };
export const HABIT_SCHEDULES: HabitSchedule[] = ['Every day', 'Weekdays', '3x a week', 'Weekly'];
export const HABIT_PREFERRED_TIMES: HabitPreferredTime[] = ['Anytime', 'Morning', 'Afternoon', 'Evening'];
export const REPEAT_OPTIONS: RepeatOption[] = ['Never', 'Daily', 'Weekly', 'Monthly'];
export const EARLY_ALERT_OPTIONS: EarlyAlert[] = ['Off', '10 min before', '30 min before', '1 hr before'];
export const QUICK_ADD_TYPES: ItemType[] = ['task', 'event', 'voiceMemo', 'note', 'habit'];
/** Orden de las secciones en la vista agrupada (igual que `GROUP_ORDER` de la app). */
export const GROUP_ORDER: ItemType[] = ['event', 'task', 'habit', 'note', 'voiceMemo'];

export interface DemoItem {
  id: string;
  type: ItemType;
  title: string;
  /** Día del ítem ("YYYY-MM-DD"). En un hábito es la fecha de creación. */
  date: string;
  /** Minutos desde medianoche: recordatorio (tarea/nota/voz) o inicio (evento). */
  time: number | null;
  priority: PriorityLevel;
  category: CategoryId | null;
  /** Solo tareas. */
  done: boolean;
  durationMin?: number;
  /** Task y Event comparten el campo (misma columna que en la app). */
  link?: string;
  repeat?: RepeatOption;
  earlyAlert?: EarlyAlert;
  schedule?: HabitSchedule;
  preferredTime?: HabitPreferredTime;
  /** `null` = "Ninguna" (auto-registro apagado). Ver `HEALTH_METRIC_OPTIONS`. */
  healthMetric?: string | null;
  healthMetricTarget?: number | null;
  /** Días en que el hábito se marcó hecho. */
  completed?: string[];
  /** Racha previa a la demo, para que los hábitos de ejemplo no arranquen en 0. */
  streakBase?: number;
  health?: boolean;
  body?: string;
  /** URL local (blob:) de una grabación real hecha en la demo. */
  audioUrl?: string | null;
  durationSec?: number;
}

// ─── Fechas ────────────────────────────────────────────────────────────────
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const shiftKey = (key: string, amount: number) => toDateKey(addDays(fromDateKey(key), amount));

export function clock12(minutes: number): { h: string; m: string; ap: 'AM' | 'PM'; label: string } {
  const h24 = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, '0');
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h = String(h24 % 12 === 0 ? 12 : h24 % 12);
  return { h, m, ap, label: `${h}:${m} ${ap}` };
}
export const minutesToInput = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const inputToMinutes = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

// ─── Hábitos (misma regla que `isHabitScheduledOn` de la app) ───────────────
export function isHabitScheduledOn(item: DemoItem, key: string): boolean {
  if (item.date > key) return false;
  if (item.schedule === 'Weekdays') {
    const day = fromDateKey(key).getDay();
    return day !== 0 && day !== 6;
  }
  return true;
}
/** Días seguidos cumplidos, contando hasta hoy (o hasta ayer si hoy todavía
 * no se marcó: el día en curso no rompe la racha). `streakBase` suma la
 * racha "previa" de los hábitos de ejemplo. */
export function habitStreak(item: DemoItem, todayKey: string): number {
  const done = new Set(item.completed ?? []);
  let key = done.has(todayKey) ? todayKey : shiftKey(todayKey, -1);
  let run = 0;
  while (done.has(key)) {
    run++;
    key = shiftKey(key, -1);
  }
  return run === 0 ? 0 : run + (item.streakBase ?? 0);
}

/** Ítems visibles en Hoy para un día: los propios del día + los hábitos
 * programados, sin las tareas hechas ni los hábitos ya marcados ese día (en
 * la app desaparecen al completarse, con Deshacer). */
export function visibleFor(items: DemoItem[], key: string): DemoItem[] {
  const rows = items.filter((i) => {
    if (i.type === 'habit') return isHabitScheduledOn(i, key) && !(i.completed ?? []).includes(key);
    return i.date === key && !(i.type === 'task' && i.done);
  });
  const timed = rows.filter((i) => i.time !== null).sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
  const untimed = rows.filter((i) => i.time === null);
  // Hábitos de salud al final, como en la app (`sortWithHealthHabitsLast`).
  return [...timed, ...untimed.filter((i) => !i.health), ...untimed.filter((i) => i.health)];
}

/** "X de Y hechos" del día (misma cuenta que `DayBar`). */
export function dayProgress(items: DemoItem[], key: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const i of items) {
    if (i.type === 'habit') {
      if (!isHabitScheduledOn(i, key)) continue;
      total++;
      if ((i.completed ?? []).includes(key)) done++;
    } else if (i.date === key) {
      total++;
      if (i.type === 'task' && i.done) done++;
    }
  }
  return { done, total };
}

// ─── Datos de ejemplo ───────────────────────────────────────────────────────
export type SeedTitles = {
  q3: string;
  dentist: string;
  lunch: string;
  idea: string;
  read: string;
  steps: string;
  proposal: string;
  standup: string;
  trip: string;
};

export function seedItems(titles: SeedTitles, today: Date): DemoItem[] {
  const t = toDateKey(today);
  const tomorrow = toDateKey(addDays(today, 1));
  const yesterday = toDateKey(addDays(today, -1));
  const weekAgo = toDateKey(addDays(today, -7));
  const base = { priority: 'none' as PriorityLevel, category: null, done: false };
  return [
    { ...base, id: 'q3', type: 'task', title: titles.q3, date: t, time: null, category: 'Work', priority: 'high' },
    { ...base, id: 'dentist', type: 'task', title: titles.dentist, date: t, time: 10 * 60 + 45, done: true, category: 'Health' },
    { ...base, id: 'lunch', type: 'event', title: titles.lunch, date: t, time: 13 * 60, durationMin: 60, category: 'Personal' },
    { ...base, id: 'idea', type: 'voiceMemo', title: titles.idea, date: t, time: null, durationSec: 42, audioUrl: null },
    {
      ...base,
      id: 'read',
      type: 'habit',
      title: titles.read,
      date: weekAgo,
      time: null,
      schedule: 'Every day',
      completed: [yesterday],
      streakBase: 4,
    },
    {
      ...base,
      id: 'steps',
      type: 'habit',
      title: titles.steps,
      date: weekAgo,
      time: null,
      schedule: 'Every day',
      completed: [],
      health: true,
      category: 'Health',
      healthMetric: 'steps',
      healthMetricTarget: 10000,
    },
    { ...base, id: 'proposal', type: 'task', title: titles.proposal, date: tomorrow, time: 9 * 60, category: 'Work', priority: 'medium' },
    { ...base, id: 'standup', type: 'event', title: titles.standup, date: tomorrow, time: 10 * 60, durationMin: 30, category: 'Work' },
    { ...base, id: 'trip', type: 'note', title: titles.trip, date: yesterday, time: null, body: '' },
  ];
}

// ─── Etiquetas de presets (copia de `PRESET_LABELS_ES`/`presetLabel` de la
// app) — el valor interno siempre queda en inglés, esto solo traduce lo
// visible. ───────────────────────────────────────────────────────────────
const PRESET_LABELS_ES: Record<string, string> = {
  Anytime: 'Cualquier hora',
  Off: 'Apagado',
  Never: 'Nunca',
  Daily: 'Diario',
  Weekly: 'Semanal',
  Monthly: 'Mensual',
  Today: 'Hoy',
  Tomorrow: 'Mañana',
  'Every day': 'Todos los días',
  Weekdays: 'Días de semana',
  '3x a week': '3x por semana',
  Morning: 'Mañana',
  Afternoon: 'Tarde',
  Evening: 'Noche',
  '10 min before': '10 min antes',
  '30 min before': '30 min antes',
  '1 hr before': '1 h antes',
};

export function presetLabel(value: string, lang: Language): string {
  if (lang === 'en') return value;
  return PRESET_LABELS_ES[value] ?? value;
}
