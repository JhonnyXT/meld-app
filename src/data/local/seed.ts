import { db } from './db';
import { dayItems } from './schema';
import { toDateKey } from '@/domain/date';
import { ANY_TIME_HHMM } from '@/domain/time';

/**
 * Contenido de ejemplo que reproduce el mock de Today (diseño Stitch) en el primer
 * arranque, para poder validar visualmente la pantalla contra el diseño real.
 * Solo se inserta si la tabla está vacía.
 */
export async function seedIfEmpty(): Promise<void> {
  const existing = await db.select().from(dayItems).limit(1);
  if (existing.length > 0) return;

  const today = toDateKey(new Date());
  const now = new Date().toISOString();

  type SeedRow = typeof dayItems.$inferInsert;
  type SeedInput = Pick<SeedRow, 'id' | 'type' | 'title'> & Partial<Omit<SeedRow, 'id' | 'type' | 'title'>>;

  const mk = (overrides: SeedInput): SeedRow => ({
    createdAt: now,
    updatedAt: now,
    date: today,
    status: 'scheduled',
    ...overrides,
  });

  await db.insert(dayItems).values([
    mk({
      id: 'seed-task-handheld',
      type: 'task',
      title: 'Handheld (@handhelddesign)',
      link: 'https://x.com/handhelddesign/status/1938693218060837',
      reminderAt: `${today}T${ANY_TIME_HHMM}:00.000Z`,
      priority: 'none',
    }),
    mk({
      id: 'seed-task-review-q3',
      type: 'task',
      title: 'Review the Q3 planning doc',
      category: 'Work',
      categoryColor: '#4F84FF',
      reminderAt: `${today}T${ANY_TIME_HHMM}:00.000Z`,
      priority: 'medium',
    }),
    mk({
      id: 'seed-task-dentist',
      type: 'task',
      title: 'Call the dentist',
      startTime: '10:45',
      reminderAt: `${today}T10:45:00.000Z`,
      status: 'done',
      priority: 'low',
    }),
    mk({
      id: 'seed-event-lunch',
      type: 'event',
      title: 'Lunch with Alex',
      category: 'Personal',
      categoryColor: '#A55CFF',
      startTime: '13:00',
      endTime: '14:00',
    }),
    mk({
      id: 'seed-voice-landing',
      type: 'voiceMemo',
      title: 'Idea for the landing page',
      audioFileUri: '',
      durationSeconds: 42,
    }),
    mk({
      id: 'seed-habit-floss',
      type: 'habit',
      title: 'Floss',
      targetFrequency: '7x semana',
      currentStreak: 2,
      progress: '2/7',
      autoTrack: false,
      colorStyle: 'default',
    }),
    mk({
      id: 'seed-habit-move-ring',
      type: 'habit',
      title: 'Move ring',
      targetFrequency: 'Diario',
      currentStreak: 1,
      progress: '1/1',
      autoTrack: true,
      healthMetric: 'moveRingClosed',
      colorStyle: 'cool',
    }),
    mk({
      id: 'seed-inbox-new-idea',
      type: 'note',
      title: 'Look into the new project brief',
      status: 'inbox',
      date: null,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    }),
    mk({
      id: 'seed-inbox-thought',
      type: 'voiceMemo',
      title: 'Thought on the onboarding flow',
      status: 'inbox',
      date: null,
      audioFileUri: '',
      durationSeconds: 18,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }),
    mk({
      id: 'seed-inbox-flights',
      type: 'note',
      title: 'Book the flights',
      status: 'inbox',
      date: null,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  ]);
}
