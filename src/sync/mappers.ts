import type { DayItem } from '@/domain/dayItem';
import type { Category } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';

export type ItemCollection = 'items' | 'habitCompletions' | 'taskCompletions' | 'categories';

export const COLLECTION_PATH: Record<ItemCollection, string> = {
  items: 'items',
  habitCompletions: 'habitCompletions',
  taskCompletions: 'taskCompletions',
  categories: 'categories',
};

export interface VersionedDoc {
  updatedAt: string;
  deletedAt?: string | null;
}

export interface RemoteDoc<T> {
  id: string;
  data: T & VersionedDoc;
  serverUpdatedAt: number;
}

export function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function tombstoneDoc(deletedAt: string): VersionedDoc {
  return { updatedAt: deletedAt, deletedAt };
}

export interface DayItemDoc extends VersionedDoc {
  categoryId: string | null;
  [key: string]: unknown;
}

export function dayItemToDoc(item: DayItem, categoryId: string | null): DayItemDoc {
  const { id: _id, ...rest } = item;
  return stripUndefined({ ...rest, categoryId, deletedAt: null }) as DayItemDoc;
}

export function docToDayItem(id: string, doc: DayItemDoc): DayItem {
  const { categoryId: _categoryId, deletedAt: _deletedAt, ...rest } = doc;
  return { ...rest, id } as unknown as DayItem;
}

export interface CompletionDoc extends VersionedDoc {
  date: string;
}

export interface HabitCompletionDoc extends CompletionDoc {
  habitId: string;
  byUid?: string | null;
}

export interface TaskCompletionDoc extends CompletionDoc {
  taskId: string;
  byUid?: string | null;
}

export function habitCompletionToDoc(row: {
  habitId: string;
  date: string;
  updatedAt: string;
  deletedAt: string | null;
  byUid?: string | null;
}): HabitCompletionDoc {
  return stripUndefined({
    habitId: row.habitId,
    date: row.date,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    byUid: row.byUid,
  });
}

export function taskCompletionToDoc(row: {
  taskId: string;
  date: string;
  updatedAt: string;
  deletedAt: string | null;
  byUid?: string | null;
}): TaskCompletionDoc {
  return stripUndefined({
    taskId: row.taskId,
    date: row.date,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    byUid: row.byUid,
  });
}

export interface CategoryDoc extends VersionedDoc {
  label: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export function categoryToDoc(category: Category, updatedAt: string): CategoryDoc {
  return {
    label: category.label,
    icon: category.icon,
    color: category.color,
    sortOrder: category.sortOrder,
    updatedAt,
    deletedAt: null,
  };
}

export function docToCategory(id: string, doc: CategoryDoc): Category {
  return { id, label: doc.label, icon: doc.icon as IconName, color: doc.color, sortOrder: doc.sortOrder };
}

export interface AppSettingsDoc extends VersionedDoc {
  theme: string;
  accent: string;
  language: string;
  listSpacing: string;
  completedItemStyle: string;
  habitsInToday: boolean;
  coolHabits: boolean;
  onboardingCompleted: boolean;
}

export interface SpaceDoc {
  ownerUid: string;
  memberUids: string[];
  editorUids?: string[];
  createdAt: string;
  deletedAt?: string | null;
}

export interface SpaceMemberDoc {
  name: string;
  joinedAt: string;
  leftAt?: string | null;
  updatedAt: string;
}

export interface SpaceCategoryDoc {
  label: string;
  icon: string;
  color: string;
  updatedAt: string;
}

export interface InviteCodeDoc {
  spaceId: string;
  createdBy: string;
  role?: 'editor' | 'viewer';
  expiresAt: number;
}

export type SpaceItemDoc = Omit<DayItemDoc, 'categoryId'> & {
  completedByUid?: string | null;
};

export function dayItemToSpaceDoc(item: DayItem, completedByUid?: string | null): SpaceItemDoc {
  const { id: _id, ...rest } = item;
  return stripUndefined({ ...rest, deletedAt: null, completedByUid }) as SpaceItemDoc;
}

export function docToDayItemFromSpace(id: string, doc: SpaceItemDoc): DayItem {
  const { deletedAt: _deletedAt, completedByUid: _completedByUid, ...rest } = doc;
  return { ...rest, id } as unknown as DayItem;
}
