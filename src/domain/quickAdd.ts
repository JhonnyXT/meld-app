import type { PriorityLevel } from './dayItem';
import type { IconName } from './iconNames';
import type { Language, TranslationKey } from '@/i18n';

export const QUICK_ADD_TYPES = ['task', 'event', 'voiceMemo', 'note', 'habit'] as const;
export type QuickAddType = (typeof QUICK_ADD_TYPES)[number];

export const QUICK_ADD_META: Record<
  QuickAddType,
  {
    icon: IconName;
    tabLabelKey: TranslationKey;
    sheetTitleKey: TranslationKey;
    placeholderKey: TranslationKey;
    ctaAddKey: TranslationKey;
    ctaUpdateKey: TranslationKey;
  }
> = {
  task: {
    icon: 'check',
    tabLabelKey: 'typeTask',
    sheetTitleKey: 'newTask',
    placeholderKey: 'placeholderTask',
    ctaAddKey: 'ctaAddTask',
    ctaUpdateKey: 'ctaUpdateTask',
  },
  event: {
    icon: 'calendar-month',
    tabLabelKey: 'typeEvent',
    sheetTitleKey: 'newEvent',
    placeholderKey: 'placeholderEvent',
    ctaAddKey: 'ctaAddEvent',
    ctaUpdateKey: 'ctaUpdateEvent',
  },
  voiceMemo: {
    icon: 'mic',
    tabLabelKey: 'typeVoiceNote',
    sheetTitleKey: 'newVoiceNote',
    placeholderKey: 'placeholderVoiceNote',
    ctaAddKey: 'ctaAddVoiceNote',
    ctaUpdateKey: 'ctaUpdateVoiceNote',
  },
  note: {
    icon: 'description',
    tabLabelKey: 'typeNote',
    sheetTitleKey: 'newNote',
    placeholderKey: 'placeholderNote',
    ctaAddKey: 'ctaAddNote',
    ctaUpdateKey: 'ctaUpdateNote',
  },
  habit: {
    icon: 'repeat',
    tabLabelKey: 'typeHabit',
    sheetTitleKey: 'newHabit',
    placeholderKey: 'placeholderHabit',
    ctaAddKey: 'ctaAddHabit',
    ctaUpdateKey: 'ctaUpdateHabit',
  },
};

// Categorías por default (siembra de la tabla `categories`, ver `db.ts`) y
// fallback de palabras clave de `voiceParser.ts` — desde 2026-09-11 las
// categorías reales son configurables por el usuario en Ajustes (tabla
// `categories`, `store/categoriesStore.ts`), esta lista fija ya NO es lo que
// lee `CategoryChips` en Quick Add/`ItemDetailSheet`. `label` es el valor
// canónico que se persiste en `DayItem.category` — siempre en inglés,
// independiente del idioma de la UI (ver `presetLabel` arriba). `labelKey`
// es la traducción que se muestra en el chip.
export const QUICK_ADD_CATEGORIES: { label: string; labelKey: TranslationKey; color: string }[] = [
  { label: 'Work', labelKey: 'categoryWork', color: '#4F84FF' },
  { label: 'Personal', labelKey: 'categoryPersonal', color: '#A55CFF' },
  { label: 'Health', labelKey: 'categoryHealth', color: '#5dde97' },
];

/** Paleta acotada de colores elegibles al crear/editar una categoría (Ajustes
 * > Categorías) — mismo criterio que `accentPalette` de `theme/tokens.ts`
 * (swatches fijos, no un color picker libre). */
export const CATEGORY_COLOR_PALETTE = [
  '#4F84FF',
  '#A55CFF',
  '#5dde97',
  '#F2A93B',
  '#E5484D',
  '#4F9DDE',
  '#e2793d',
  '#8E8E93',
] as const;

/** Set acotado de íconos elegibles para una categoría — ver
 * `components/settings/CategoryFormModal.tsx`. */
export const CATEGORY_ICON_OPTIONS: IconName[] = [
  'briefcase',
  'person',
  'favorite',
  'book-open',
  'home',
  'star',
  'cart',
  'music',
  'photo-camera',
  'dumbbell',
  'view-grid',
  'checklist',
  'plane',
  'folder',
  'sparkles',
  'palette',
];

export const PRIORITY_OPTIONS: { id: PriorityLevel; labelKey: TranslationKey; color: string }[] = [
  { id: 'none', labelKey: 'priorityNone', color: '#8E8E93' },
  { id: 'low', labelKey: 'priorityLow', color: '#4F9DDE' },
  { id: 'medium', labelKey: 'priorityMed', color: '#F2A93B' },
  { id: 'high', labelKey: 'priorityHigh', color: '#E5484D' },
];

/** Color de la bandera de prioridad por nivel — misma paleta que
 * `PRIORITY_OPTIONS`, expuesto aparte para la fila (`DayItemRow`) sin tener
 * que hacer `.find` en cada render. */
export const PRIORITY_COLOR: Record<PriorityLevel, string> = {
  none: '#8E8E93',
  low: '#4F9DDE',
  medium: '#F2A93B',
  high: '#E5484D',
};

// Los valores de estos presets son el estado interno real (se guardan tal
// cual en el dominio — p. ej. `repeatRule`, o se parsean con labelToHour24 /
// earlyAlertToMinutes / frequencyTarget más abajo).
// SIEMPRE en inglés — cambiar de idioma no debe alterar cómo se persisten ni
// cómo `cycleValue` los compara. Lo que se traduce es solo la ETIQUETA que
// ve el usuario, vía `presetLabel()`.
export const REPEAT_OPTIONS = ['Never', 'Daily', 'Weekly', 'Monthly'];

export const EARLY_ALERT_OPTIONS = ['Off', '10 min before', '30 min before', '1 hr before'];


export const HABIT_SCHEDULE_OPTIONS = ['Every day', 'Weekdays', '3x a week', 'Weekly'];
export const HABIT_PREFERRED_TIME_OPTIONS = ['Anytime', 'Morning', 'Afternoon', 'Evening'];

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

/** Traduce SOLO la etiqueta visible de un preset — el valor interno (estado,
 * `cycleValue`, parsers de abajo) siempre queda en inglés. */
export function presetLabel(value: string, lang: Language): string {
  if (lang === 'en') return value;
  return PRESET_LABELS_ES[value] ?? value;
}

export function cycleValue(options: string[], current: string): string {
  const i = options.indexOf(current);
  return options[(i + 1) % options.length];
}

const PART_OF_DAY_HOURS: Record<string, string> = {
  Morning: '09:00',
  Afternoon: '14:00',
  Evening: '18:00',
};

/** Convierte una hora en formato "9:00 AM" / "Morning" / etc. a "HH:MM" 24h. */
export function labelToHour24(label: string): string | null {
  if (label in PART_OF_DAY_HOURS) return PART_OF_DAY_HOURS[label];
  const match = label.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return null;
  let [, h, m, meridiem] = match;
  let hour = Number(h) % 12;
  if (meridiem.toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${m}`;
}

export function addMinutesToHour24(hour24: string, minutes: number): string {
  const [h, m] = hour24.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

const EARLY_ALERT_TO_MINUTES: Record<string, number> = {
  '10 min before': 10,
  '30 min before': 30,
  '1 hr before': 60,
};

export function earlyAlertToMinutes(label: string): number | null {
  return label === 'Off' ? null : (EARLY_ALERT_TO_MINUTES[label] ?? null);
}

export function frequencyTarget(schedule: string): number {
  switch (schedule) {
    case 'Every day':
      return 7;
    case 'Weekdays':
      return 5;
    case '3x a week':
      return 3;
    case 'Weekly':
      return 1;
    default:
      return 7;
  }
}
