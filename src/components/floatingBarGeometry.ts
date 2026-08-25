/**
 * Geometría compartida entre `FloatingBar` (que se estira hacia arriba mientras
 * hay un arrastre de hora activo) y `TimeDragOverlay` (que necesita saber cuánto
 * espacio libre dejar por encima de esa barra para el ruler y la captura del
 * gesto). Mantenerlas en un solo lugar evita que las dos queden desincronizadas.
 */
export const FLOATING_BAR_MARGIN = 16;
export const FLOATING_BAR_HEIGHT = 72;
export const FLOATING_BAR_CONFIRM_ROW_HEIGHT = 56;
/** Alto del divisor entre la fila de confirmación de hora y la barra principal
 * (ahora son una sola card continua, no dos pastillas separadas por un hueco). */
export const FLOATING_BAR_ROW_GAP = 1;
