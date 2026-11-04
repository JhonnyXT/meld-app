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

// ─── Espacios compartidos (Fase 4) ──────────────────────────────────────────────
// `spaces/{spaceId}` es la categoría compartida: sus ítems viajan ahí (no al respaldo personal de
// `users/{uid}/items`), igual que el ítem compartido de `my-wallet-app` pero con 3 subcolecciones
// en vez de una (`items`/`habitCompletions`/`taskCompletions`, en vez de `transactions`) y
// `config/category` en vez de `config/list`. Puro: solo describe la forma del documento — la
// lectura/escritura real (reglas en `firestore.rules`) llega en un paso aparte, junto con la UI y
// el motor de sync (este archivo no importa Firebase, Regla #3).

/** El espacio en sí (T11: roles editor/lector; T10: tamaño máximo — ver `maxMembers()` en
 * `firestore.rules`). `editorUids` ausente = legado, todos los miembros son editores (mismo
 * fallback que las reglas). */
export interface SpaceDoc {
  ownerUid: string;
  memberUids: string[];
  editorUids?: string[];
  createdAt: string;
  deletedAt?: string | null;
}

/** Una fila por persona (`spaces/{id}/members/{uid}`, id = su propio uid — a diferencia de
 * `my-wallet-app`, Meld no tiene la variante "persona sin app"). `leftAt` queda como registro de
 * quién pasó por el espacio; `memberUids` de `SpaceDoc` es la fuente de verdad de quién sigue
 * adentro. Pensado para el indicador "quién creó/completó esto" (SYNC_ROADMAP.md, Fase 4 — "por
 * definir" todavía cómo se usa en la UI). */
export interface SpaceMemberDoc {
  name: string;
  joinedAt: string;
  leftAt?: string | null;
  updatedAt: string;
}

/** Lo compartido de la categoría — mismo contenido que `CategoryDoc` salvo `sortOrder` (no aplica
 * a un espacio, que no convive con otras categorías locales en una lista ordenada). */
export interface SpaceCategoryDoc {
  label: string;
  icon: string;
  color: string;
  updatedAt: string;
}

/** Código de invitación de un solo espacio (`inviteCodes/{code}`, id = el código mismo —
 * `firestore.rules` exige que no exista ya, así nunca se pisa uno vigente). `role` decide con qué
 * permiso se une quien lo use (`spaces/{id}` → reglas de `update`); ausente = `'editor'` (mismo
 * fallback que las reglas, ver `firestore.rules`). `expiresAt` es epoch ms al escribir desde la
 * app (`remote.ts` lo convierte a `Timestamp` de Firestore, igual que `serverTimestamp()` en
 * `pushBatch`) — las reglas exigen que no pase de 8 días desde el momento del `create`. */
export interface InviteCodeDoc {
  spaceId: string;
  createdBy: string;
  role?: 'editor' | 'viewer';
  expiresAt: number;
}

/** `items`/`habitCompletions`/`taskCompletions` de un espacio son casi lo mismo que los
 * personales, SIN `categoryId` (la categoría es el espacio entero, no hace falta apuntar a
 * cuál) — D5 del diseño de My Wallet: mover un ítem a otra categoría (sea personal o compartida)
 * le da un id nuevo en el destino + tombstone del viejo, nunca se "migra" el mismo documento. */
export type SpaceItemDoc = Omit<DayItemDoc, 'categoryId'>;

export function dayItemToSpaceDoc(item: DayItem): SpaceItemDoc {
  const { id: _id, ...rest } = item;
  return stripUndefined({ ...rest, deletedAt: null }) as SpaceItemDoc;
}

export function docToDayItemFromSpace(id: string, doc: SpaceItemDoc): DayItem {
  const { deletedAt: _deletedAt, ...rest } = doc;
  return { ...rest, id } as unknown as DayItem;
}
