/**
 * voiceParser — convierte una frase dictada (o escrita) en datos
 * estructurados para pre-llenar Quick Add. 100% offline, sin IA. Detecta:
 * tipo, título limpio, día, hora/recordatorio, prioridad, categoría y
 * repetición. Bilingüe (es/en). Un solo ítem por frase.
 *
 * Filosofía (igual que `my-wallet-app/src/utils/voiceParser.ts`): keyword
 * matching pragmático, no una gramática completa. Los campos no detectados
 * quedan `null` para que Quick Add use su default y el usuario confirme.
 * La versión con IA (multi-ítem, más precisa) está en el roadmap Pro.
 */
import type { Language } from '@/i18n/translations';
import type { PriorityLevel } from './dayItem';
import type { QuickAddType } from './quickAdd';
import { QUICK_ADD_CATEGORIES } from './quickAdd';
import { toDateKey, addDays } from './date';

export type VoiceType = Extract<QuickAddType, 'task' | 'event' | 'note' | 'habit'>;

export interface VoicePrefill {
  type: VoiceType;
  title: string;
  /** `null` = sin fecha explícita → Quick Add usa su default (hoy). */
  dateKey: string | null;
  /** Minutos desde medianoche, o `null` si no se detectó hora. Para task/
   * note es el recordatorio; para event, la hora de inicio; para habit se
   * mapea a Mañana/Tarde/Noche. */
  timeMinutes: number | null;
  priority: PriorityLevel | null;
  category: { label: string; color: string } | null;
  /** Ya normalizado al vocabulario del tipo: `HABIT_SCHEDULE_OPTIONS` para
   * habit, `REPEAT_OPTIONS` para el resto. `null` si no se detectó. */
  repeat: string | null;
  /** Transcripción cruda, por si el título queda vacío tras limpiar. */
  transcript: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Tipo ───────────────────────────────────────────────────────────────────
const TYPE_KEYWORDS: { type: VoiceType; re: RegExp }[] = [
  { type: 'event', re: /\b(evento|reunion|cita|junta|meeting|appointment)\b/ },
  { type: 'habit', re: /\b(habito|rutina|habit|routine)\b/ },
  { type: 'note', re: /\b(nota|apunte|note)\b/ },
  { type: 'task', re: /\b(tarea|pendiente|task|to-?do|recuerdame|recordarme|remind me)\b/ },
];

function detectType(n: string): { type: VoiceType; explicit: boolean } {
  for (const { type, re } of TYPE_KEYWORDS) {
    if (re.test(n)) return { type, explicit: true };
  }
  return { type: 'task', explicit: false };
}

// ─── Fecha ──────────────────────────────────────────────────────────────────
const WD_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const WD_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function detectDate(n: string, now: Date): string | null {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (/\bpasado manana\b/.test(n) || /\bday after tomorrow\b/.test(n)) return toDateKey(addDays(now, 2));
  // "mañana" = tomorrow, salvo "de/por la mañana" (que es una hora del día)
  const saysTomorrow =
    (/\bmanana\b/.test(n) && !/\b(de|por) la manana\b/.test(n)) || /\btomorrow\b/.test(n);
  if (saysTomorrow) return toDateKey(addDays(now, 1));
  if (/\bhoy\b/.test(n) || /\btoday\b/.test(n)) return toDateKey(now);

  const inN = n.match(/\b(?:en|in) (\d{1,2}) (?:dias?|days?)\b/);
  if (inN) return toDateKey(addDays(now, parseInt(inN[1], 10)));

  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b(${WD_ES[i]}|${WD_EN[i]})\\b`).test(n)) {
      let delta = (i - now.getDay() + 7) % 7;
      if (delta === 0) delta = 7; // "el lunes" cuando hoy es lunes → el próximo
      return toDateKey(addDays(now, delta));
    }
  }

  const dayNum = n.match(/\b(?:el|dia|on the) (\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dayNum) {
    const d = parseInt(dayNum[1], 10);
    if (d >= 1 && d <= 31) {
      let target = new Date(now.getFullYear(), now.getMonth(), d);
      if (target.getTime() < todayStart.getTime()) target = new Date(now.getFullYear(), now.getMonth() + 1, d);
      return toDateKey(target);
    }
  }
  return null;
}

// ─── Hora ───────────────────────────────────────────────────────────────────
function resolveHour(h: number, ctx: string, tail: string): number {
  const pm = /\bp\.?m\.?\b/.test(tail) || /\bde la (tarde|noche)\b/.test(ctx) || /\bin the (afternoon|evening)\b/.test(ctx);
  const am = /\ba\.?m\.?\b/.test(tail) || /\bde la manana\b/.test(ctx) || /\bin the morning\b/.test(ctx);
  if (pm && h < 12) return h + 12;
  if (am && h === 12) return 0;
  if (!pm && !am && h >= 1 && h <= 7) return h + 12; // heurística: "a las 3" → 3 PM
  return h;
}

function detectTime(n: string): number | null {
  if (/\b(mediodia|noon)\b/.test(n)) return 12 * 60;
  if (/\b(medianoche|midnight)\b/.test(n)) return 0;

  // "15:30" / "3:30 pm" / "3.30"
  let m = n.match(/\b(\d{1,2})[:.](\d{2})\s*(a\.?m\.?|p\.?m\.?)?/);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 24 && min < 60) {
      h = resolveHour(h, n, m[3] ?? '');
      return h * 60 + min;
    }
  }

  // "a las 3" / "a las 3 y media" / "at 3" / "3pm"
  m = n.match(/\b(?:a la?s?|at) (\d{1,2})(?:\s*y\s*(media|cuarto))?\b/);
  if (!m) m = n.match(/\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (h >= 0 && h <= 23) {
      const frac = m[2] ?? '';
      const min = frac === 'media' ? 30 : frac === 'cuarto' ? 15 : 0;
      const tail = /a\.?m\.?|p\.?m\.?/.test(frac) ? frac : '';
      h = resolveHour(h, n, tail);
      return h * 60 + min;
    }
  }
  return null;
}

// ─── Prioridad ──────────────────────────────────────────────────────────────
function detectPriority(n: string): PriorityLevel | null {
  if (/\b(urgente|urgent|importante|important|alta prioridad|prioridad alta|high priority)\b/.test(n)) return 'high';
  if (/\b(prioridad media|media prioridad|medium priority)\b/.test(n)) return 'medium';
  if (/\b(prioridad baja|baja prioridad|low priority)\b/.test(n)) return 'low';
  return null;
}

// ─── Categoría ──────────────────────────────────────────────────────────────
const CATEGORY_KW: Record<string, RegExp> = {
  Work: /\b(trabajo|oficina|laburo|work|office)\b/,
  Personal: /\b(personal|familia|casa)\b/,
  Health: /\b(salud|medico|doctor|dentista|gym|gimnasio|ejercicio|health|workout|dentist)\b/,
};

function detectCategory(n: string): { label: string; color: string } | null {
  for (const cat of QUICK_ADD_CATEGORIES) {
    const re = CATEGORY_KW[cat.label];
    if (re && re.test(n)) return { label: cat.label, color: cat.color };
  }
  return null;
}

// ─── Repetición ─────────────────────────────────────────────────────────────
interface RepeatFlags {
  daily: boolean;
  weekdays: boolean;
  weekly: boolean;
  monthly: boolean;
  threeX: boolean;
}

function repeatFlags(n: string): RepeatFlags {
  return {
    daily: /\b(todos los dias|cada dia|a diario|every ?day|daily)\b/.test(n),
    weekdays: /\b(entre semana|dias de semana|dias habiles|weekdays|every weekday)\b/.test(n),
    weekly: /\b(cada semana|todas las semanas|semanal|weekly|every week)\b/.test(n),
    monthly: /\b(cada mes|todos los meses|mensual|monthly|every month)\b/.test(n),
    threeX: /\b(3 veces por semana|tres veces por semana|3x (a|per) week|3 times a week)\b/.test(n),
  };
}

function detectRepeat(f: RepeatFlags, type: VoiceType): string | null {
  if (type === 'habit') {
    if (f.weekdays) return 'Weekdays';
    if (f.threeX) return '3x a week';
    if (f.weekly || f.monthly) return 'Weekly';
    if (f.daily) return 'Every day';
    return null;
  }
  if (f.monthly) return 'Monthly';
  if (f.weekly || f.weekdays || f.threeX) return 'Weekly';
  if (f.daily) return 'Daily';
  return null;
}

// ─── Limpieza del título ────────────────────────────────────────────────────
const KILL_PATTERNS: RegExp[] = [
  // imperativos / muletillas
  /\b(recu[eé]rdame|recordarme|acu[eé]rdate|acordate|ag[eé]ndame|ag[eé]nda|agendar)\b/gi,
  /\bque\s+(tengo que|debo|hay que|no se me olvide)\b/gi,
  /\b(agrega|agregar|crea|crear|a[ñn]ade|a[ñn]adir|pon|poner|anota|anotar|apunta|apuntar)\b/gi,
  /\b(nueva|nuevo|una|un|la|el)\s+(tarea|evento|nota|h[áa]bito|rutina|cita|reuni[óo]n)\b/gi,
  /\b(tarea|evento|nota|h[áa]bito|rutina)\b/gi,
  /\b(remind me to|remind me|add an?|create an?|schedule an?|make an?|note to|jot down|new)\b/gi,
  /\b(task|event|habit|routine|reminder)\b/gi,
  /\b(por favor|please)\b/gi,
  // fecha
  /\b(pasado\s+ma[ñn]ana|ma[ñn]ana|hoy|day after tomorrow|tomorrow|today)\b/gi,
  /\b(este|el|pr[óo]ximo|next|this)\s+(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\b(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\b(el\s+)?d[íi]a\s+\d{1,2}\b/gi,
  /\bel\s+\d{1,2}\b/gi,
  /\bon the \d{1,2}(?:st|nd|rd|th)?\b/gi,
  /\b(en|in)\s+\d{1,2}\s+(d[íi]as?|days?)\b/gi,
  // hora
  /\ba\s+la?s?\s+\d{1,2}([:.]\d{2})?(\s*y\s*(media|cuarto))?/gi,
  /\bat\s+\d{1,2}([:.]\d{2})?/gi,
  /\b\d{1,2}[:.]\d{2}\s*(a\.?m\.?|p\.?m\.?)?/gi,
  /\b\d{1,2}\s*(a\.?m\.?|p\.?m\.?)\b/gi,
  /\b(a\.?m\.?|p\.?m\.?)\b/gi,
  /\bde\s+la\s+(ma[ñn]ana|tarde|noche)\b/gi,
  /\bin\s+the\s+(morning|afternoon|evening)\b/gi,
  /\b(al\s+)?(mediod[íi]a|medianoche|noon|midnight)\b/gi,
  // prioridad
  /\b(urgente|urgent|importante|important|(alta|media|baja)\s+prioridad|prioridad\s+(alta|media|baja)|(high|medium|low)\s+priority)\b/gi,
  // repetición
  /\b(todos\s+los\s+d[íi]as|cada\s+d[íi]a|a\s+diario|every\s?day|daily)\b/gi,
  /\b(entre\s+semana|d[íi]as\s+(de\s+semana|h[áa]biles)|weekdays)\b/gi,
  /\b(cada\s+semana|todas\s+las\s+semanas|semanal|weekly|every\s+week)\b/gi,
  /\b(cada\s+mes|todos\s+los\s+meses|mensual|monthly|every\s+month)\b/gi,
  /\b(3\s*veces\s+por\s+semana|tres\s+veces\s+por\s+semana|3x\s*(a|per)\s*week|3\s+times\s+a\s+week)\b/gi,
  // categoría solo cuando viene como etiqueta ("de trabajo", "para salud")
  /\b(de|para)\s+(trabajo|la oficina|salud)\b/gi,
];

/** Conectores/artículos sueltos que quedan colgando en un extremo del título
 * tras remover los marcadores (fecha/hora/etc.). Se recortan en bloque (uno o
 * varios seguidos) en ambos extremos. */
const EDGE_CONNECTORS = 'para|el|la|los|las|de|del|al|a|con|y|the|to|for|of|and|at|on|in';

function cleanTitle(raw: string): string {
  let s = ` ${raw} `;
  for (const re of KILL_PATTERNS) s = s.replace(re, ' ');
  s = s
    .replace(/\s+/g, ' ')
    .replace(new RegExp(`^\\s*(?:(?:${EDGE_CONNECTORS})\\s+)+`, 'i'), '')
    .replace(new RegExp(`(?:\\s+(?:${EDGE_CONNECTORS}))+\\s*$`, 'i'), '')
    .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, '')
    .trim();
  if (!s) return raw.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Principal ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseVoiceInput(raw: string, _lang: Language, now: Date = new Date()): VoicePrefill {
  const n = normalize(raw);

  let { type, explicit } = detectType(n);
  const flags = repeatFlags(n);
  const dateKey = detectDate(n, now);
  const timeMinutes = detectTime(n);

  // Sin tipo explícito + señal fuerte de recurrencia + sin fecha puntual →
  // es un hábito ("leer 20 minutos todos los días").
  if (!explicit && (flags.daily || flags.weekdays || flags.threeX) && !dateKey) {
    type = 'habit';
  }

  const repeat = detectRepeat(flags, type);
  const title = cleanTitle(raw);

  return {
    type,
    title,
    dateKey,
    timeMinutes,
    priority: detectPriority(n),
    category: detectCategory(n),
    repeat,
    transcript: raw.trim(),
  };
}
