# 0027 — Tocar un chip en Mes abre el detalle, no Today; "+N" abre la lista del día

**Fecha:** 2026-11-19

## Contexto

En la vista Mes, toda la celda era un único `Pressable` que navegaba a Today de ese día — tocar un
chip de ítem hacía lo mismo que tocar el número del día o un espacio vacío. El usuario pidió que
tocar un ítem puntual abra su detalle (como en Google Calendar), reservando "ir a Today" para tocar
el resto de la celda, y pidió una idea para cuando un día tiene más ítems de los que entran como
chips.

## Decisión

- **`MonthDayCell`** ahora distingue tres zonas táctiles en vez de una: el fondo/número del día
  sigue llamando a `onPressDay` (navega a Today, comportamiento histórico sin cambios), cada chip es
  su propio `Pressable` que llama a `onPressItem(item.id)`, y el "+N" es un `Pressable` aparte que
  llama a `onPressOverflow(dateKey)`. Los `Pressable` anidados no disparan el `onPress` del padre
  (mismo patrón ya usado en `CategoriesScreen` para el botón de compartir dentro de la fila) — no
  hace falta `stopPropagation` manual.
- **Idea elegida para el overflow**: en vez de intentar mostrar más chips apretando el layout (se
  vuelve ilegible) o una barra de scroll dentro de la celda (gesto confuso dentro de un `FlashList`
  que ya scrollea verticalmente), tocar "+N" abre `DayItemsModal` — un bottom sheet con la lista
  COMPLETA de ítems de ese día (no solo los que sobraban), cada fila con ícono de tipo + color de
  categoría, y tocar una fila cierra el modal y abre su detalle. Mismo patrón ya construido para
  "ítems de una categoría" (`CategoryItemsModal`) — se extrajo el mapa ítem→ícono compartido a
  `src/domain/itemTypeIcon.ts` para no duplicarlo entre los dos modales.
- La vista Semana (grilla horaria, ADR 0026) ya abría el detalle al tocar un bloque desde que se
  implementó — no necesitó cambios para esta decisión.

## Consecuencias

- `goToDay` sigue siendo necesario y se mantiene como comportamiento de "tocar en cualquier parte
  vacía de la celda" — no se eliminó esa forma de navegar a Today desde Mes.
- Si en el futuro se agregan más acciones por ítem (ej. completar una task sin abrir el detalle),
  agregarlas como otro `Pressable` anidado más, siguiendo el mismo patrón.

Código: `src/components/calendar/MonthDayCell.tsx`; `src/components/calendar/DayItemsModal.tsx`;
`src/domain/itemTypeIcon.ts`.
