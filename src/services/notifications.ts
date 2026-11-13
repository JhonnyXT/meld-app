import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { DayItem } from '@/domain/dayItem';
import { ANY_TIME_HHMM } from '@/domain/time';
import { useSettingsStore } from '@/store/settingsStore';
import { useItemDetailStore } from '@/store/itemDetailStore';
import { translate } from '@/i18n';
import { completeItemFromNotification, MARK_DONE_ACTION } from './notificationActions';

const ANDROID_CHANNEL_ID = 'reminders';
let channelReady: Promise<void> | null = null;

function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelReady) {
    channelReady = Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: translate(useSettingsStore.getState().language, 'settingsNotifications'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    }).then(() => undefined);
  }
  return channelReady;
}

const COMPLETABLE_CATEGORY = 'completable';
let categoriesReady: Promise<void> | null = null;

function ensureCategories(): Promise<void> {
  if (!categoriesReady) {
    categoriesReady = Notifications.setNotificationCategoryAsync(COMPLETABLE_CATEGORY, [
      {
        identifier: MARK_DONE_ACTION,
        buttonTitle: translate(useSettingsStore.getState().language, 'notificationMarkDone'),
        options: { opensAppToForeground: false },
      },
    ]).then(() => undefined);
  }
  return categoriesReady;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function localDateFromReminderAt(reminderAt: string): Date {
  const [datePart, timePart] = reminderAt.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.slice(0, 5).split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function getNotificationPermissionStatus(): Promise<Notifications.NotificationPermissionsStatus> {
  return Notifications.getPermissionsAsync();
}

export async function requestNotificationPermission(): Promise<Notifications.NotificationPermissionsStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !current.canAskAgain) return current;
  return Notifications.requestPermissionsAsync();
}

export async function primeNotificationPermissionOnLaunch(): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'undetermined') {
    const requested = await Notifications.requestPermissionsAsync();
    if (requested.granted) useSettingsStore.getState().setNotificationsEnabled(true);
  }
}

const WEEKDAY_IDS = [2, 3, 4, 5, 6];

function weekdayIdentifier(itemId: string, weekday: number): string {
  return `${itemId}:wd:${weekday}`;
}

function toExpoWeekday(jsDay: number): number {
  return jsDay + 1;
}

async function cancelAllVariants(itemId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(itemId).catch(() => {});
  await Promise.all(WEEKDAY_IDS.map((wd) => Notifications.cancelScheduledNotificationAsync(weekdayIdentifier(itemId, wd)).catch(() => {})));
}

export async function cancelReminderNotification(itemId: string): Promise<void> {
  await cancelAllVariants(itemId);
}

export async function syncReminderNotification(item: DayItem): Promise<void> {
  await cancelReminderNotification(item.id);
  if (!item.reminderAt) return;
  const hhmm = item.reminderAt.slice(11, 16);
  if (hhmm === ANY_TIME_HHMM) return;

  if (!useSettingsStore.getState().notificationsEnabled) return;

  const anchor = localDateFromReminderAt(item.reminderAt);
  const hour = anchor.getHours();
  const minute = anchor.getMinutes();

  const granted = await ensurePermission();
  if (!granted) return;
  await ensureAndroidChannel();

  const isCompletable = item.type === 'task' || item.type === 'habit';
  if (isCompletable) await ensureCategories();
  const content = {
    title: item.title,
    body: translate(useSettingsStore.getState().language, 'notificationBody'),
    data: { itemId: item.id },
    ...(isCompletable ? { categoryIdentifier: COMPLETABLE_CATEGORY } : {}),
  };

  if (item.type === 'task' && item.repeatRule) {
    if (item.repeatRule === 'Daily') {
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: ANDROID_CHANNEL_ID },
      });
    } else if (item.repeatRule === 'Weekly') {
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(anchor.getDay()),
          hour,
          minute,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    } else if (item.repeatRule === 'Monthly') {
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day: anchor.getDate(),
          hour,
          minute,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
    return;
  }

  if (item.type === 'habit') {
    if (item.targetFrequency === 'Weekdays') {
      await Promise.all(
        WEEKDAY_IDS.map((weekday) =>
          Notifications.scheduleNotificationAsync({
            identifier: weekdayIdentifier(item.id, weekday),
            content,
            trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute, channelId: ANDROID_CHANNEL_ID },
          }),
        ),
      );
    } else {
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: ANDROID_CHANNEL_ID },
      });
    }
    return;
  }

  if (anchor.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: item.id,
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: anchor, channelId: ANDROID_CHANNEL_ID },
  });
}

export function registerNotificationResponseHandling(onItemCompleted?: () => void): () => void {
  ensureCategories().catch(() => {});

  const handle = (response: Notifications.NotificationResponse) => {
    const { identifier, content } = response.notification.request;
    const itemId = (content.data as { itemId?: string } | undefined)?.itemId;
    if (!itemId) return;

    if (response.actionIdentifier === MARK_DONE_ACTION) {
      completeItemFromNotification(itemId)
        .then(() => {
          onItemCompleted?.();
          return Notifications.dismissNotificationAsync(identifier);
        })
        .catch(() => {});
      return;
    }
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      Notifications.dismissNotificationAsync(identifier).catch(() => {});
      useItemDetailStore.getState().open(itemId);
    }
  };

  const last = Notifications.getLastNotificationResponse();
  if (last) {
    Notifications.clearLastNotificationResponse();
    handle(last);
  }
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
