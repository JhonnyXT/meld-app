import { Platform } from 'react-native';
import { getTodayWidgetData } from './todayWidgetData';
import { getHabitsWidgetData } from './habitsWidgetData';
import { WIDGET_NAMES, buildAndroidWidgetTree } from './androidWidgetTree';
import { widgetAppGroup } from '@/constants/appVariant';
import { refreshAppBadge } from '@/services/appBadge';

export async function refreshWidgets(): Promise<void> {
  refreshAppBadge();
  try {
    if (Platform.OS === 'android') {
      const { requestWidgetUpdate } = require('react-native-android-widget');
      await Promise.all(
        [WIDGET_NAMES.today, WIDGET_NAMES.habits, WIDGET_NAMES.progress].map((widgetName) =>
          requestWidgetUpdate({
            widgetName,
            renderWidget: (info: { width?: number; height?: number }) => buildAndroidWidgetTree(widgetName, info),
          }),
        ),
      );
      return;
    }
    if (Platform.OS === 'ios') {
      if (!widgetAppGroup) return;
      const { ExtensionStorage } = require('@bacons/apple-targets');
      const storage = new ExtensionStorage(widgetAppGroup);

      const today = await getTodayWidgetData();
      storage.set('todayDateKey', today.dateKey);
      storage.set('todayDoneCount', today.doneCount);
      storage.set('todayTotalCount', today.totalCount);
      storage.set('todayItems', today.items);

      const habits = await getHabitsWidgetData();
      storage.set('habitsDoneCount', habits.doneCount);
      storage.set('habitsTotalCount', habits.totalCount);
      storage.set(
        'habitsRows',
        habits.rows.map((row) => ({ id: row.id, title: row.title, progress: row.progress, streak: row.streak })),
      );

      ExtensionStorage.reloadWidget(WIDGET_NAMES.today);
      ExtensionStorage.reloadWidget(WIDGET_NAMES.habits);
      ExtensionStorage.reloadWidget(WIDGET_NAMES.progress);
    }
  } catch {
    return;
  }
}
