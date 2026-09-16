import type { DayItem } from '@/domain/dayItem';

/** SVGs mínimos estilo Lucide (mismo lenguaje visual que `components/Icon.tsx`
 * en el resto de la app) para el widget de Android — `SvgWidget` de
 * `react-native-android-widget` no soporta re-tintar en runtime como
 * `<Icon color=.../>`, así que el color queda horneado en el `stroke` del
 * string. Si se agrega un tipo de `DayItem` nuevo, agregar su ícono acá. */
const STROKE = '#8E8E93';

function svg(paths: string, stroke: string = STROKE): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

const ICON_BY_TYPE: Record<DayItem['type'], string> = {
  task: svg('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  event: svg(
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  ),
  voiceMemo: svg(
    '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  ),
  note: svg(
    '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
  ),
  habit: svg(
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  ),
  moment: svg(
    '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  ),
};

export const WIDGET_SUN_ICON_SVG = svg(
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
);

/** Blanco (no dim) — se dibuja sobre el círculo coral del widget "Agregar
 * rápido" (`QuickAddAndroidWidget.tsx`), no sobre el fondo oscuro. */
export const WIDGET_PLUS_ICON_SVG = svg('<path d="M5 12h14"/><path d="M12 5v14"/>', '#FFFFFF');

export const WIDGET_REPEAT_ICON_SVG = ICON_BY_TYPE.habit;

export function widgetIconSvgFor(type: DayItem['type']): string {
  return ICON_BY_TYPE[type];
}
