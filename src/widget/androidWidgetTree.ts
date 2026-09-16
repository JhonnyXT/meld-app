import React from 'react';
import { getTodayWidgetData } from './todayWidgetData';
import { getHabitsWidgetData } from './habitsWidgetData';
import { TodayAndroidWidget } from './TodayAndroidWidget';
import { QuickAddAndroidWidget } from './QuickAddAndroidWidget';
import { ProgressAndroidWidget } from './ProgressAndroidWidget';
import { HabitsAndroidWidget } from './HabitsAndroidWidget';
import { widgetContentScale } from './widgetScale';
import { useSettingsStore } from '@/store/settingsStore';
import { translate } from '@/i18n';

/** Los 4 "tipos" de widget de Android — cada uno es una entrada separada en
 * `app.config.ts` → plugin `react-native-android-widget`, y aparece como su
 * propia página en el selector de widgets del sistema (no son tamaños
 * distintos del mismo widget — eso es el caso de `TODAY`, que además se
 * adapta de forma continua a su tamaño real, ver `pickVisibleItemCount`
 * más abajo). */
export const WIDGET_NAMES = {
  today: 'TodayWidget',
  quickAdd: 'QuickAddWidget',
  progress: 'ProgressWidget',
  habits: 'HabitsWidget',
} as const;

export type WidgetName = (typeof WIDGET_NAMES)[keyof typeof WIDGET_NAMES];

/** Alto aproximado (dp) de cada pieza del widget — usado para calcular
 * cuántos ítems entran sin dejar espacio vacío ni recortar contenido, ver
 * `pickVisibleItemCount`. Números a ojo a partir del layout real de
 * `TodayAndroidWidget.tsx`/`HabitsAndroidWidget.tsx` (padding 16
 * arriba/abajo, header ~24, gap 12, filas de ~16 + gap 9) — no hace falta
 * que sea exacto al pixel, solo conservador para no cortar una fila a la
 * mitad. */
const VERTICAL_PADDING = 32;
const HEADER_HEIGHT = 24;
const HEADER_TO_LIST_GAP = 12;
const ROW_HEIGHT = 25;

/** Android no tiene tamaños fijos como iOS (Small/Medium/Large) — el
 * usuario arrastra el widget "Hoy"/"Hábitos" a cualquier tamaño dentro de
 * min/max, así que el MISMO widget tiene que decidir cuántos ítems mostrar
 * según el alto real que le tocó ese render (`widgetInfo.height`, en dp) en
 * vez de mostrar siempre un número fijo y dejar un hueco si lo agrandaron,
 * o cortar de golpe si lo achicaron — bug real reportado por el usuario
 * (captura del widget con espacio de sobra abajo), corregido acá.
 *
 * El alto de fila usado para el cálculo va escalado por
 * `widgetContentScale` — mismo factor que agranda la tipografía/íconos
 * (ver `TodayAndroidWidget.tsx`/`HabitsAndroidWidget.tsx`), así que ambos
 * van de la mano: si las filas se ven más grandes (widget grande, escala
 * >1), entran MENOS filas más cómodas en vez de muchas filas chicas — el
 * pedido explícito del usuario de que el widget se vea "profesional y
 * limpio" en vez de contenido diminuto perdido en una caja grande. */
function pickVisibleItemCount(heightDp: number | undefined, widthDp: number | undefined, totalAvailable: number): number {
  if (!heightDp) return Math.min(totalAvailable, 5);
  const scale = widgetContentScale(widthDp, heightDp);
  const available = heightDp - VERTICAL_PADDING - HEADER_HEIGHT * scale - HEADER_TO_LIST_GAP * scale;
  const fitCount = Math.floor(available / (ROW_HEIGHT * scale));
  return Math.max(1, Math.min(fitCount, totalAvailable));
}

interface WidgetInfoLike {
  height?: number;
  width?: number;
}

/** Arma el árbol JSX del widget de Android que corresponda según
 * `widgetName`, con datos frescos de la DB — usado tanto por
 * `requestWidgetUpdate` (disparado en foreground desde
 * `refreshTodayWidget`, que pasa el `WidgetInfo` real de cada widget
 * agregado) como por el headless task handler (`WIDGET_ADDED`/
 * `WIDGET_UPDATE`/`WIDGET_RESIZED`, ver `registerWidgetTask.ts`).
 * `useSettingsStore.getState()` funciona fuera de React (Zustand no
 * depende del árbol de componentes) — como límite conocido, si el store
 * todavía no rehidrató desde AsyncStorage (headless recién arrancado,
 * antes de que el usuario haya abierto la app alguna vez) usa el default
 * `'es'`. */
export async function buildAndroidWidgetTree(widgetName: string, widgetInfo?: WidgetInfoLike) {
  const lang = useSettingsStore.getState().language;

  switch (widgetName) {
    case WIDGET_NAMES.quickAdd:
      return React.createElement(QuickAddAndroidWidget, {
        label: translate(lang, 'widgetQuickAddLabel'),
        width: widgetInfo?.width,
        height: widgetInfo?.height,
      });

    case WIDGET_NAMES.progress: {
      const data = await getTodayWidgetData();
      return React.createElement(ProgressAndroidWidget, {
        doneCount: data.doneCount,
        totalCount: data.totalCount,
        todayLabel: translate(lang, 'today'),
        subLabel: translate(lang, 'widgetProgressSubLabel'),
        width: widgetInfo?.width,
        height: widgetInfo?.height,
      });
    }

    case WIDGET_NAMES.habits: {
      const data = await getHabitsWidgetData();
      const visibleCount = pickVisibleItemCount(widgetInfo?.height, widgetInfo?.width, data.rows.length);
      return React.createElement(HabitsAndroidWidget, {
        data: { ...data, rows: data.rows.slice(0, visibleCount) },
        habitsLabel: translate(lang, 'widgetHabitsLabel'),
        emptyLabel: translate(lang, 'widgetNoHabits'),
        width: widgetInfo?.width,
        height: widgetInfo?.height,
      });
    }

    case WIDGET_NAMES.today:
    default: {
      const data = await getTodayWidgetData();
      const visibleCount = pickVisibleItemCount(widgetInfo?.height, widgetInfo?.width, data.items.length);
      return React.createElement(TodayAndroidWidget, {
        data: { ...data, items: data.items.slice(0, visibleCount) },
        todayLabel: translate(lang, 'today'),
        emptyLabel: translate(lang, 'widgetEmpty'),
        width: widgetInfo?.width,
        height: widgetInfo?.height,
      });
    }
  }
}
