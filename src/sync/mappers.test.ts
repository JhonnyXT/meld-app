import type { Task, Note } from '@/domain/dayItem';
import type { Category } from '@/domain/category';
import {
  categoryToDoc,
  dayItemToDoc,
  docToCategory,
  docToDayItem,
  habitCompletionToDoc,
  stripUndefined,
  taskCompletionToDoc,
  tombstoneDoc,
} from './mappers';

const TASK: Task = {
  id: 't1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  date: '2026-01-01',
  title: 'Llamar al dentista',
  category: 'Personal',
  categoryColor: '#8B5CF6',
  reminderAt: null,
  status: 'scheduled',
  type: 'task',
  priority: 'high',
  repeatRule: null,
  link: null,
};

const NOTE: Note = {
  id: 'n1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  date: null,
  title: 'Nota',
  category: null,
  categoryColor: null,
  reminderAt: null,
  status: 'inbox',
  type: 'note',
  priority: 'none',
  richTextBody: 'contenido',
};

describe('stripUndefined', () => {
  it('quita solo las claves con valor undefined', () => {
    expect(stripUndefined({ a: 1, b: undefined, c: null, d: 0 })).toEqual({ a: 1, c: null, d: 0 });
  });
});

describe('dayItemToDoc / docToDayItem', () => {
  it('ida y vuelta conserva el ítem (menos id, que va aparte)', () => {
    const doc = dayItemToDoc(TASK, 'cat-personal');
    expect(doc.categoryId).toBe('cat-personal');
    expect(doc.deletedAt).toBeNull();
    const back = docToDayItem(TASK.id, doc);
    expect(back).toEqual(TASK);
  });

  it('sin categoryId (ítem sin categoría)', () => {
    const doc = dayItemToDoc(NOTE, null);
    expect(doc.categoryId).toBeNull();
    expect(docToDayItem(NOTE.id, doc)).toEqual(NOTE);
  });

  it('no sube campos undefined de otro tipo (p. ej. Note no tiene repeatRule)', () => {
    const doc = dayItemToDoc(NOTE, null);
    expect('repeatRule' in doc).toBe(false);
  });
});

describe('tombstoneDoc', () => {
  it('solo versión + marca, sin contenido', () => {
    expect(tombstoneDoc('2026-02-01T00:00:00.000Z')).toEqual({
      updatedAt: '2026-02-01T00:00:00.000Z',
      deletedAt: '2026-02-01T00:00:00.000Z',
    });
  });
});

describe('completions', () => {
  it('habitCompletionToDoc', () => {
    expect(
      habitCompletionToDoc({
        habitId: 'h1',
        date: '2026-01-01',
        updatedAt: '2026-01-01T08:00:00.000Z',
        deletedAt: null,
      }),
    ).toEqual({ habitId: 'h1', date: '2026-01-01', updatedAt: '2026-01-01T08:00:00.000Z', deletedAt: null });
  });

  it('taskCompletionToDoc', () => {
    expect(
      taskCompletionToDoc({
        taskId: 'tk1',
        date: '2026-01-02',
        updatedAt: '2026-01-02T08:00:00.000Z',
        deletedAt: null,
      }),
    ).toEqual({ taskId: 'tk1', date: '2026-01-02', updatedAt: '2026-01-02T08:00:00.000Z', deletedAt: null });
  });
});

describe('categoryToDoc / docToCategory', () => {
  const category: Category = { id: 'cat-1', label: 'Casa', icon: 'home', color: '#22C55E', sortOrder: 2 };

  it('ida y vuelta conserva la categoría', () => {
    const doc = categoryToDoc(category, '2026-01-01T00:00:00.000Z');
    expect(docToCategory(category.id, doc)).toEqual(category);
  });
});
