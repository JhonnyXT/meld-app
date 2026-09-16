import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { db } from './db';
import { dayItems, habitCompletions } from './schema';
import { addDays, toDateKey } from '@/domain/date';
import { getISOWeek } from '@/domain/week';
import { ANY_TIME_HHMM } from '@/domain/time';

/**
 * Contenido de ejemplo para el variant `dev` (gateado con `isDev` en
 * `TodayScreen`). Antes solo reproducía el mock de Today; ahora siembra data
 * "completa" — tareas/eventos/notas/nota de voz/hábitos con historial real de
 * completado (`habit_completions`) y Momentos con foto — repartida por el mes
 * actual, para poder sacar screenshots representativos de Today / Hábitos /
 * Calendario / Momentos (los mockups del onboarding, ver
 * `src/features/onboarding/`). Solo se inserta si `day_items` está vacía.
 */

const CAT = {
  work: { category: 'Trabajo', categoryColor: '#4F84FF' },
  personal: { category: 'Personal', categoryColor: '#A55CFF' },
  health: { category: 'Salud', categoryColor: '#34C759' },
  finance: { category: 'Finanzas', categoryColor: '#FF9F0A' },
} as const;

const SEED_PHOTOS = [
  require('../../../assets/seed/seed-moment-1.jpg'),
  require('../../../assets/seed/seed-moment-2.jpg'),
  require('../../../assets/seed/seed-moment-3.jpg'),
  require('../../../assets/seed/seed-moment-4.jpg'),
];

// Clips de audio silencioso, solo para que las notas de voz de ejemplo tengan
// un archivo reproducible real (si `audioFileUri` está vacío, la fila muestra
// "Audio eliminado" en vez del botón de play).
const SEED_AUDIO = [
  require('../../../assets/seed/seed-voice-1.m4a'),
  require('../../../assets/seed/seed-voice-2.m4a'),
];

/** Copia un asset del bundle a almacenamiento propio y devuelve su `file://`. */
async function materializeAsset(mod: number, name: string): Promise<string | null> {
  try {
    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    const src = asset.localUri ?? asset.uri;
    const dir = new Directory(Paths.document, 'seed');
    if (!dir.exists) dir.create();
    const dest = new File(dir, name);
    if (dest.exists) return dest.uri;
    new File(src).copySync(dest);
    return dest.uri;
  } catch {
    return null;
  }
}

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.select().from(dayItems).limit(1);
  if (existing.length > 0) return;

  const now = new Date();
  const nowIso = now.toISOString();
  const todayKey = toDateKey(now);
  const monthPrefix = todayKey.slice(0, 7); // "2026-08"
  const dayInMonth = (d: number) => `${monthPrefix}-${String(d).padStart(2, '0')}`;

  type SeedRow = typeof dayItems.$inferInsert;
  type SeedInput = Pick<SeedRow, 'id' | 'type' | 'title'> & Partial<Omit<SeedRow, 'id' | 'type' | 'title'>>;

  const mk = (overrides: SeedInput): SeedRow => ({
    createdAt: nowIso,
    updatedAt: nowIso,
    date: todayKey,
    status: 'scheduled',
    priority: 'none',
    ...overrides,
  });

  const photoUris = await Promise.all(
    SEED_PHOTOS.map((mod, i) => materializeAsset(mod, `seed-moment-${i + 1}.jpg`)),
  );
  const audioUris = await Promise.all(
    SEED_AUDIO.map((mod, i) => materializeAsset(mod, `seed-voice-${i + 1}.m4a`)),
  );

  // ── Hoy ────────────────────────────────────────────────────────────────
  const todayRows: SeedRow[] = [
    mk({
      id: 'seed-task-proposal',
      type: 'task',
      title: 'Terminar la propuesta de diseño',
      startTime: '15:30',
      reminderAt: `${todayKey}T15:30:00.000Z`,
      priority: 'high',
      link: 'https://docs.google.com/document/d/1',
      repeatRule: 'Weekly',
      ...CAT.work,
    }),
    mk({
      id: 'seed-task-dentist',
      type: 'task',
      title: 'Llamar al dentista',
      reminderAt: `${todayKey}T${ANY_TIME_HHMM}:00.000Z`,
      priority: 'medium',
      ...CAT.health,
    }),
    mk({
      id: 'seed-task-emails',
      type: 'task',
      title: 'Responder los correos del equipo',
      priority: 'low',
      ...CAT.work,
    }),
    mk({ id: 'seed-task-internet', type: 'task', title: 'Pagar la factura de internet', status: 'done', ...CAT.finance }),
    mk({ id: 'seed-task-checkup', type: 'task', title: 'Sacar turno con el médico', status: 'done', ...CAT.health }),
    mk({
      id: 'seed-event-standup',
      type: 'event',
      title: 'Reunión de equipo',
      startTime: '16:00',
      endTime: '16:30',
      link: 'https://meet.google.com/abc-defg-hij',
      ...CAT.work,
    }),
    mk({
      id: 'seed-event-dinner',
      type: 'event',
      title: 'Cena con Alex',
      startTime: '20:00',
      endTime: '21:30',
      ...CAT.personal,
    }),
    mk({ id: 'seed-note-onboarding', type: 'note', title: 'Ideas para el rediseño del onboarding', richTextBody: '' }),
    mk({ id: 'seed-note-groceries', type: 'note', title: 'Lista de la compra de la semana', richTextBody: '' }),
    mk({
      id: 'seed-voice-landing',
      type: 'voiceMemo',
      title: 'Nota de voz sobre la landing',
      audioFileUri: audioUris[0] ?? '',
      durationSeconds: 42,
    }),
    mk({
      id: 'seed-voice-standup',
      type: 'voiceMemo',
      title: 'Resumen del standup',
      audioFileUri: audioUris[1] ?? '',
      durationSeconds: 27,
    }),
  ];

  // ── Atrasadas (para ver el rollover de tareas en Hoy) ───────────────────
  const overdueRows: SeedRow[] = [
    mk({
      id: 'seed-task-overdue-contract',
      type: 'task',
      title: 'Revisar el contrato del proveedor',
      date: toDateKey(addDays(now, -3)),
      priority: 'high',
      ...CAT.work,
    }),
    mk({
      id: 'seed-task-overdue-invoice',
      type: 'task',
      title: 'Enviar la factura pendiente',
      date: toDateKey(addDays(now, -1)),
      ...CAT.finance,
    }),
  ];

  // ── Inbox ──────────────────────────────────────────────────────────────
  const inboxRows: SeedRow[] = [
    mk({
      id: 'seed-inbox-brief',
      type: 'note',
      title: 'Revisar el brief del proyecto nuevo',
      status: 'inbox',
      date: null,
      createdAt: new Date(now.getTime() - 2 * 3600_000).toISOString(),
    }),
    mk({
      id: 'seed-inbox-flights',
      type: 'note',
      title: 'Reservar los vuelos',
      status: 'inbox',
      date: null,
      createdAt: new Date(now.getTime() - 26 * 3600_000).toISOString(),
    }),
    mk({
      id: 'seed-inbox-voice',
      type: 'voiceMemo',
      title: 'Idea sobre el flujo de captura',
      status: 'inbox',
      date: null,
      audioFileUri: audioUris[1] ?? '',
      durationSeconds: 18,
      createdAt: new Date(now.getTime() - 3 * 24 * 3600_000).toISOString(),
    }),
  ];

  // ── Hábitos ────────────────────────────────────────────────────────────
  type HabitSeed = {
    id: string;
    title: string;
    schedule: string;
    cool?: boolean;
    healthMetric?: string;
    healthMetricTarget?: number;
    /** offsets (días atrás desde hoy) marcados como hechos. */
    doneOffsets: number[];
    createdDay: number;
  };

  const range = (from: number, to: number) => {
    const out: number[] = [];
    for (let i = from; i <= to; i++) out.push(i);
    return out;
  };
  const weekdayOffsets = (span: number) =>
    range(1, span).filter((o) => {
      const d = addDays(now, -o).getDay();
      return d !== 0 && d !== 6;
    });
  const nthDayOffsets = (span: number, days: number[]) =>
    range(1, span).filter((o) => days.includes(addDays(now, -o).getDay()));

  const habitSeeds: HabitSeed[] = [
    { id: 'seed-habit-read', title: 'Leer 20 minutos', schedule: 'Every day', doneOffsets: range(1, 14), createdDay: 1 },
    {
      id: 'seed-habit-meditate',
      title: 'Meditar',
      schedule: 'Weekdays',
      doneOffsets: weekdayOffsets(24),
      createdDay: 2,
    },
    {
      id: 'seed-habit-workout',
      title: 'Entrenar fuerza',
      schedule: '3x a week',
      cool: true,
      healthMetric: 'strengthTraining',
      doneOffsets: nthDayOffsets(35, [1, 3, 5]), // lun/mié/vie
      createdDay: 3,
    },
    {
      id: 'seed-habit-steps',
      title: '10.000 pasos',
      schedule: 'Every day',
      cool: true,
      healthMetric: 'steps',
      healthMetricTarget: 10000,
      doneOffsets: [1, 2, 3, 4, 6, 7, 8], // gap el día 5
      createdDay: 4,
    },
  ];

  const habitRows: SeedRow[] = habitSeeds.map((h) =>
    mk({
      id: h.id,
      type: 'habit',
      title: h.title,
      date: dayInMonth(h.createdDay),
      targetFrequency: h.schedule,
      currentStreak: Math.min(h.doneOffsets.length, 14),
      progress: `${Math.min(h.doneOffsets.filter((o) => o <= 7).length, 7)}/7`,
      autoTrack: Boolean(h.healthMetric),
      healthMetric: h.healthMetric ?? null,
      healthMetricTarget: h.healthMetricTarget ?? null,
      colorStyle: h.cool ? 'cool' : 'default',
    }),
  );

  const completionRows = habitSeeds.flatMap((h) =>
    h.doneOffsets.map((offset) => ({
      id: `${h.id}-${offset}`,
      habitId: h.id,
      date: toDateKey(addDays(now, -offset)),
    })),
  );

  // ── Repartido por el mes (Calendario) ──────────────────────────────────
  const spread: Array<Partial<SeedRow> & Pick<SeedRow, 'id' | 'type' | 'title' | 'date'>> = [
    { id: 'seed-cal-1', type: 'event', title: 'Kickoff cliente', date: dayInMonth(2), startTime: '11:00', endTime: '12:00', ...CAT.work },
    { id: 'seed-cal-2', type: 'task', title: 'Enviar informe mensual', date: dayInMonth(4), ...CAT.work, priority: 'medium' },
    { id: 'seed-cal-3', type: 'task', title: 'Renovar el seguro', date: dayInMonth(6), ...CAT.finance },
    { id: 'seed-cal-4', type: 'event', title: 'Gimnasio con Sam', date: dayInMonth(7), startTime: '07:30', endTime: '08:30', ...CAT.health },
    { id: 'seed-cal-5', type: 'note', title: 'Notas de la retro', date: dayInMonth(9), richTextBody: '' },
    { id: 'seed-cal-6', type: 'event', title: 'Almuerzo con Jordan', date: dayInMonth(11), startTime: '13:00', endTime: '14:00', ...CAT.personal },
    { id: 'seed-cal-7', type: 'task', title: 'Comprar regalo de cumpleaños', date: dayInMonth(14), ...CAT.personal, priority: 'low' },
    { id: 'seed-cal-8', type: 'event', title: 'Revisión de diseño', date: dayInMonth(16), startTime: '15:00', endTime: '16:00', ...CAT.work },
    { id: 'seed-cal-9', type: 'task', title: 'Pagar el alquiler', date: dayInMonth(18), ...CAT.finance, priority: 'high' },
    { id: 'seed-cal-10', type: 'event', title: 'Cita médica anual', date: dayInMonth(21), startTime: '09:00', endTime: '10:00', ...CAT.health },
    { id: 'seed-cal-11', type: 'note', title: 'Lista de la compra', date: dayInMonth(23), richTextBody: '' },
    { id: 'seed-cal-12', type: 'event', title: 'Llamada con inversores', date: dayInMonth(26), startTime: '17:00', endTime: '17:45', ...CAT.work },
    { id: 'seed-cal-13', type: 'task', title: 'Preparar la presentación', date: dayInMonth(28), ...CAT.work, priority: 'medium' },
  ];
  const spreadRows: SeedRow[] = spread.map((s) => mk(s));

  // ── Momentos (varias fotos por día, días recientes + uno en el mes) ────
  const momentRows: SeedRow[] = [];
  const addMoment = (id: string, when: Date, uri: string | null) => {
    if (!uri) return;
    momentRows.push(
      mk({
        id,
        type: 'moment',
        title: `Momento ${toDateKey(when)}`,
        date: toDateKey(when),
        mediaUri: uri,
        weekOfYear: getISOWeek(when),
      }),
    );
  };
  // Hoy con 2 fotos (para mostrar que se pueden guardar varias por día).
  addMoment('seed-moment-today-1', now, photoUris[0]);
  addMoment('seed-moment-today-2', now, photoUris[1]);
  addMoment('seed-moment-3d', addDays(now, -3), photoUris[2]);
  // Uno en el mes para que se vea la miniatura en una celda del grid de Mes.
  if (photoUris[3]) {
    momentRows.push(
      mk({
        id: 'seed-moment-cal',
        type: 'moment',
        title: 'Momento',
        date: dayInMonth(12),
        mediaUri: photoUris[3],
        weekOfYear: getISOWeek(new Date(now.getFullYear(), now.getMonth(), 12)),
      }),
    );
  }

  await db
    .insert(dayItems)
    .values([...todayRows, ...overdueRows, ...inboxRows, ...habitRows, ...spreadRows, ...momentRows]);

  if (completionRows.length > 0) {
    await db.insert(habitCompletions).values(completionRows);
  }
}
