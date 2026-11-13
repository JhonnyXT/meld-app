import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { initDb } from '@/data/local/db';
import { completeItemFromNotification, MARK_DONE_ACTION } from './notificationActions';

const TASK_NAME = 'meld-notification-actions';

function itemIdFromContent(content: unknown): string | null {
  if (!content || typeof content !== 'object') return null;
  const record = content as { data?: { itemId?: unknown } | null; dataString?: unknown };
  if (typeof record.data?.itemId === 'string') return record.data.itemId;
  if (typeof record.dataString === 'string') {
    try {
      const parsed = JSON.parse(record.dataString) as { itemId?: unknown };
      return typeof parsed.itemId === 'string' ? parsed.itemId : null;
    } catch {
      return null;
    }
  }
  return null;
}

if (Platform.OS === 'android') {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(TASK_NAME, async ({ data, error }) => {
    if (error || !data || !('actionIdentifier' in data)) return;
    if (data.actionIdentifier !== MARK_DONE_ACTION) return;
    const request = data.notification?.request;
    const itemId = itemIdFromContent(request?.content);
    if (!itemId) return;
    try {
      initDb();
      await completeItemFromNotification(itemId);
      if (request?.identifier) await Notifications.dismissNotificationAsync(request.identifier);
    } catch (e) {
      console.warn('[notificationBackgroundTask] mark done failed', e);
    }
  });

  Notifications.registerTaskAsync(TASK_NAME).catch((e) => {
    console.warn('[notificationBackgroundTask] register failed', e);
  });
}
