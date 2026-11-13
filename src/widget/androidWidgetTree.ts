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

export const WIDGET_NAMES = {
  today: 'TodayWidget',
  quickAdd: 'QuickAddWidget',
  progress: 'ProgressWidget',
  habits: 'HabitsWidget',
} as const;

export type WidgetName = (typeof WIDGET_NAMES)[keyof typeof WIDGET_NAMES];

const VERTICAL_PADDING = 32;
const HEADER_HEIGHT = 24;
const HEADER_TO_LIST_GAP = 12;
const ROW_HEIGHT = 25;

// ver docs/adr/0020-widget-items-visibles-segun-tamano-real.md
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
