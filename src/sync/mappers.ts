/**
 * Conversión local ↔ documento de Firestore (SYNC_ROADMAP.md, "Modelo en Firestore"). Puras y sin
 * imports de Firebase — `remote.ts` agrega `serverUpdatedAt` al escribir y lo quita al leer.
 */
import type { DayItem } from '@/domain/dayItem';
import type { Category } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';

/** Colecciones de `users/{uid}` que se sincronizan ítem por ítem. */
export type ItemCollection = 'items' | 'habitCompletions' | 'taskCompletions' | 'categories';

export const COLLECTION_PATH: Record<ItemCollection, string> = {
  items: 'items',
  habitCompletions: 'habitCompletions',
  taskCompletions: 'taskCompletions',
  categories: 'categories',
};

/** Lo común a todo documento: versión (ISO, reloj del teléfono) y borrado lógico. */
export interface VersionedDoc {
  updatedAt: string;
  deletedAt?: string | null;
}

/** Documento remoto ya leído, con su id y el orden del servidor (ms) para el cursor. */
export interface RemoteDoc<T> {
  id: string;
  data: T & VersionedDoc;
  serverUpdatedAt: number;
}

/** Firestore rechaza `undefined`: se quitan los campos opcionales ausentes (p. ej. los campos de
 * un tipo de `DayItem` que no aplican a otro — `Task.link` en una `Note`). */
export function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/** Marca de borrado: solo versión + marca, sin contenido (SYNC_ROADMAP.md, T5). */
export function tombstoneDoc(deletedAt: string): VersionedDoc {
  return { updatedAt: deletedAt, deletedAt };
}

// ─── day_items ────────────────────────────────────────────────────────────────

export interface DayItemDoc extends VersionedDoc {
  categoryId: string | null;
  [key: string]: unknown;
}

/** `DayItem` vivo → documento. Un ítem borrado sube solo la marca (ver `tombstoneDoc`). */
export function dayItemToDoc(item: DayItem, categoryId: string | null): DayItemDoc {
  const { id: _id, ...rest } = item;
  return stripUndefined({ ...rest, categoryId, deletedAt: null }) as DayItemDoc;
}

/** Documento → `DayItem` (sin `categoryId`: es bookkeeping de sync, no un campo de dominio — ver
 * `dayItemRepository.resolveCategoryId`). Solo para documentos vivos (`deletedAt == null`). */
export function docToDayItem(id: string, doc: DayItemDoc): DayItem {
  const { categoryId: _categoryId, deletedAt: _deletedAt, ...rest } = doc;
  return { ...rest, id } as unknown as DayItem;
}

// ─── habit_completions / task_completions ──────────────────────────────────────

export interface CompletionDoc extends VersionedDoc {
  date: string;
}

export interface HabitCompletionDoc extends CompletionDoc {
  habitId: string;
}

export interface TaskCompletionDoc extends CompletionDoc {
  taskId: string;
}

export function habitCompletionToDoc(row: {
  habitId: string;
  date: string;
  updatedAt: string;
  deletedAt: string | null;
}): HabitCompletionDoc {
  return { habitId: row.habitId, date: row.date, updatedAt: row.updatedAt, deletedAt: row.deletedAt };
}

export function taskCompletionToDoc(row: {
  taskId: string;
  date: string;
  updatedAt: string;
  deletedAt: string | null;
}): TaskCompletionDoc {
  return { taskId: row.taskId, date: row.date, updatedAt: row.updatedAt, deletedAt: row.deletedAt };
}

// ─── categories ─────────────────────────────────────────────────────────────────

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

// ─── Ajustes visuales (users/{uid}/settings/app) ──────────────────────────────────
// A diferencia de `items`/`habitCompletions`/etc. (muchos documentos, `sync_state` por fila), acá
// hay UN solo documento por usuario — mismo criterio last-write-wins vía `pickWinner`, pero sin
// lista de pendientes ni tombstone (no hay "borrar" un ajuste). Alcance: SYNC_ROADMAP.md, Fase 3,
// "Ajustes visuales" — tema/acento/idioma/espaciado/estilo de completado/hábitos en Hoy/hábitos
// "cool" + si ya pasó el onboarding. Deliberadamente afuera: `notificationsEnabled` (atado al
// permiso del SO de ESTE teléfono, no algo que restaurar) y `plan`/prueba simulada (Fase 5).

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
