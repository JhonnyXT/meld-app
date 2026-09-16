/**
 * Geometría compartida entre `FloatingBar` (que se estira hacia arriba mientras
 * hay un arrastre de hora activo) y `TimeDragOverlay` (que necesita saber cuánto
 * espacio libre dejar por encima de esa barra para el ruler y la captura del
 * gesto). Mantenerlas en un solo lugar evita que las dos queden desincronizadas.
 */
export const FLOATING_BAR_MARGIN = 16;
export const FLOATING_BAR_HEIGHT = 72;
export const FLOATING_BAR_CONFIRM_ROW_HEIGHT = 56;
/** Hueco visible entre la card flotante extra (Confirmar hora / Deshacer /
 * Volver a hoy) y el pill central — ahora son dos cards separadas flotando,
 * no una sola card continua (pedido explícito, 2026-08-29). */
export const FLOATING_BAR_ROW_GAP = 10;
