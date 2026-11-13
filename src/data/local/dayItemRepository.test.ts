import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import type { Task } from '@/domain/dayItem';

jest.mock('./db', () => {
  const Database = require('better-sqlite3');
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  const schema = require('./schema');
  const { initDb } = jest.requireActual('./db');

  const raw = new Database(':memory:');
  initDb({
    execSync: (sql: string) => raw.exec(sql),
    getFirstSync: (sql: string) => raw.prepare(sql).get() ?? null,
  });

  return { db: drizzle(raw, { schema }), __testRaw: raw };
});

import { dayItemRepository } from './dayItemRepository';

const { __testRaw } = require('./db') as { __testRaw: BetterSqlite3Database };

beforeEach(() => {
  __testRaw.exec('DELETE FROM day_items; DELETE FROM habit_completions; DELETE FROM task_completions;');
});

function task(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: 'task-1',
    createdAt: now,
    updatedAt: now,
    date: '2026-11-13',
    title: 'Comprar pan',
    category: null,
    categoryColor: null,
    reminderAt: null,
    status: 'scheduled',
    type: 'task',
    priority: 'none',
    repeatRule: null,
    link: null,
    ...overrides,
  };
}

describe('dayItemRepository — upsert/getById/listByDate', () => {
  it('guarda y relee un ítem sin perder campos', async () => {
    await dayItemRepository.upsert(task());
    const found = await dayItemRepository.getById('task-1');
    expect(found).toMatchObject({ id: 'task-1', title: 'Comprar pan', date: '2026-11-13' });
  });

  it('listByDate solo trae ítems vivos de esa fecha', async () => {
    await dayItemRepository.upsert(task({ id: 'a', date: '2026-11-13' }));
    await dayItemRepository.upsert(task({ id: 'b', date: '2026-11-14' }));
    const rows = await dayItemRepository.listByDate('2026-11-13');
    expect(rows.map((r) => r.id)).toEqual(['a']);
  });

  it('remove es un borrado lógico: desaparece de listByDate pero getSyncVersion lo sigue viendo', async () => {
    await dayItemRepository.upsert(task({ id: 'c', date: '2026-11-13' }));
    await dayItemRepository.remove('c');
    expect(await dayItemRepository.listByDate('2026-11-13')).toEqual([]);
    const version = await dayItemRepository.getSyncVersion('c');
    expect(version?.deletedAt).not.toBeNull();
  });
});

describe('dayItemRepository — listOverdueTasks', () => {
  it('trae tasks scheduled de antes de la fecha, sin repeatRule', async () => {
    await dayItemRepository.upsert(task({ id: 'old', date: '2026-11-01', status: 'scheduled' }));
    const rows = await dayItemRepository.listOverdueTasks('2026-11-13');
    expect(rows.map((r) => r.id)).toEqual(['old']);
  });

  it('excluye una task que repite, aunque su date ancla quede en el pasado', async () => {
    await dayItemRepository.upsert(task({ id: 'repeating', date: '2026-11-01', repeatRule: 'Daily' }));
    const rows = await dayItemRepository.listOverdueTasks('2026-11-13');
    expect(rows.map((r) => r.id)).not.toContain('repeating');
  });

  it('excluye una task ya completada', async () => {
    await dayItemRepository.upsert(task({ id: 'done', date: '2026-11-01', status: 'done' }));
    const rows = await dayItemRepository.listOverdueTasks('2026-11-13');
    expect(rows.map((r) => r.id)).not.toContain('done');
  });
});

describe('dayItemRepository — toggleHabitCompletion', () => {
  const HABIT_ID = 'habit-1';

  it('primera llamada marca hecho, segunda lo deshace (tombstone)', async () => {
    const first = await dayItemRepository.toggleHabitCompletion(HABIT_ID, '2026-11-13');
    expect(first).toBe(true);
    expect(await dayItemRepository.listHabitCompletionDates(HABIT_ID, '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-13',
    ]);

    const second = await dayItemRepository.toggleHabitCompletion(HABIT_ID, '2026-11-13');
    expect(second).toBe(false);
    expect(await dayItemRepository.listHabitCompletionDates(HABIT_ID, '2026-11-01', '2026-11-30')).toEqual([]);
  });

  it('reactivar un tombstone (tercera llamada) lo vuelve a marcar hecho', async () => {
    await dayItemRepository.toggleHabitCompletion(HABIT_ID, '2026-11-13');
    await dayItemRepository.toggleHabitCompletion(HABIT_ID, '2026-11-13');
    const third = await dayItemRepository.toggleHabitCompletion(HABIT_ID, '2026-11-13');
    expect(third).toBe(true);
    expect(await dayItemRepository.listHabitCompletionDates(HABIT_ID, '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-13',
    ]);
  });
});

describe('dayItemRepository — toggleTaskCompletion', () => {
  it('mismo comportamiento de toggle que los hábitos, para tasks que repiten', async () => {
    const taskId = 'repeating-task';
    expect(await dayItemRepository.toggleTaskCompletion(taskId, '2026-11-13')).toBe(true);
    expect(await dayItemRepository.listTaskCompletionDates(taskId, '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-13',
    ]);
    expect(await dayItemRepository.toggleTaskCompletion(taskId, '2026-11-13')).toBe(false);
    expect(await dayItemRepository.listTaskCompletionDates(taskId, '2026-11-01', '2026-11-30')).toEqual([]);
  });
});

describe('dayItemRepository — completedByUid al completar una task directa', () => {
  it('completar por primera vez no estampa completedByUid (lo hace la capa de sync al subir)', async () => {
    await dayItemRepository.upsert(task({ id: 'd1', status: 'scheduled' }));
    await dayItemRepository.upsert(task({ id: 'd1', status: 'done' }));
    const map = await dayItemRepository.getCompletedByUidMap(['d1']);
    expect(map.d1).toBeNull();
  });

  it('conserva completedByUid si el ítem ya estaba done y se vuelve a guardar done', async () => {
    await dayItemRepository.upsert(task({ id: 'd2', status: 'done' }));
    await dayItemRepository.setCompletedByUid('d2', 'uid-123');
    await dayItemRepository.upsert(task({ id: 'd2', status: 'done', title: 'Editado' }));
    const map = await dayItemRepository.getCompletedByUidMap(['d2']);
    expect(map.d2).toBe('uid-123');
  });

  it('limpia completedByUid cuando se descompleta', async () => {
    await dayItemRepository.upsert(task({ id: 'd3', status: 'done' }));
    await dayItemRepository.setCompletedByUid('d3', 'uid-123');
    await dayItemRepository.upsert(task({ id: 'd3', status: 'scheduled' }));
    const map = await dayItemRepository.getCompletedByUidMap(['d3']);
    expect(map.d3).toBeNull();
  });
});

describe('dayItemRepository — listPendingSync / markSynced', () => {
  it('un ítem recién creado queda pendiente; markSynced lo saca de la lista', async () => {
    await dayItemRepository.upsert(task({ id: 'p1' }));
    const pendingBefore = await dayItemRepository.listPendingSync();
    expect(pendingBefore.map((p) => p.id)).toContain('p1');

    await dayItemRepository.markSynced(['p1']);
    const pendingAfter = await dayItemRepository.listPendingSync();
    expect(pendingAfter.map((p) => p.id)).not.toContain('p1');
  });

  it('un ítem borrado queda pendiente con item: null', async () => {
    await dayItemRepository.upsert(task({ id: 'p2' }));
    await dayItemRepository.markSynced(['p2']);
    await dayItemRepository.remove('p2');
    const pending = await dayItemRepository.listPendingSync();
    const row = pending.find((p) => p.id === 'p2');
    expect(row?.item).toBeNull();
    expect(row?.deletedAt).not.toBeNull();
  });
});
