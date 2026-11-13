import { Platform } from 'react-native';
import { initDb } from '@/data/local/db';

if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { buildAndroidWidgetTree } = require('./androidWidgetTree');
  const { toggleTaskCompleteFromWidget, toggleHabitCompleteFromWidget } = require('./widgetActions');

  registerWidgetTaskHandler(
    async ({
      widgetAction,
      widgetInfo,
      renderWidget,
      clickAction,
      clickActionData,
    }: {
      widgetAction: string;
      widgetInfo: { widgetName: string; width?: number; height?: number };
      renderWidget: (el: unknown) => void;
      clickAction?: string;
      clickActionData?: Record<string, unknown>;
    }) => {
      const { widgetName, width, height } = widgetInfo;
      if (widgetAction === 'WIDGET_DELETED') return;
      initDb();

      if (widgetAction === 'WIDGET_CLICK') {
        const id = clickActionData?.id;
        if (clickAction === 'TOGGLE_TASK' && typeof id === 'string') {
          await toggleTaskCompleteFromWidget(id);
        } else if (clickAction === 'TOGGLE_HABIT' && typeof id === 'string') {
          await toggleHabitCompleteFromWidget(id);
        }
      }
      await require('@/services/appBadge').refreshAppBadge();

      const tree = await buildAndroidWidgetTree(widgetName, { width, height });
      renderWidget(tree);
    },
  );
}
