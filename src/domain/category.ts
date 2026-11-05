import type { IconName } from './iconNames';

/** Categoría configurable por el usuario (Ajustes > Categorías) — reemplaza
 * a la lista fija `QUICK_ADD_CATEGORIES` (que ahora solo sirve como default
 * de siembra y fallback de palabras clave de `voiceParser.ts`). `label` es
 * texto libre tipeado por el usuario, sin `labelKey` de traducción — no
 * tiene sentido traducir un nombre que el usuario eligió. Vive suelta de
 * `DayItem.category`/`categoryColor` (que son texto copiado al crear el
 * ítem, mismo patrón que el título de un hábito): renombrar/recolorear una
 * categoría NO actualiza retroactivamente los ítems que ya la usan, y
 * borrarla los deja con ese texto "huérfano" en vez de reasignarlos. */
/** Mi rol en una categoría compartida (SYNC_ROADMAP.md, Fase 4) — un lector no puede crear,
 * editar, completar ni borrar ítems de esa categoría (Quick Add, detalle, swipe, checkbox,
 * widgets la deshabilitan). `undefined` en `Category.space` = categoría personal, el caso de
 * siempre. */
export type SpaceRole = 'editor' | 'viewer';

/** Presente solo si esta categoría es una categoría compartida (vive también en
 * `spaces/{spaceId}`, con `spaceId` siempre igual a `Category.id` — ver el comentario largo en
 * `data/local/schema.ts` → `categories.spaceId`). */
export interface CategorySpaceLink {
  spaceId: string;
  role: SpaceRole;
  ownerUid: string;
}

export interface Category {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  sortOrder: number;
  space?: CategorySpaceLink;
}
