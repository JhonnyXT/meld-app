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
export interface Category {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  sortOrder: number;
}
