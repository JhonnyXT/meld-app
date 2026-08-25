import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { DayItem } from '@/domain/dayItem';
import { ANY_TIME_HHMM } from '@/domain/time';
import { useSettingsStore } from '@/store/settingsStore';
import { translate } from '@/i18n';

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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * `reminderAt` se persiste como "YYYY-MM-DDTHH:MM:00.000Z" pero el sufijo "Z" es
 * un artefacto de formato: HH:MM es siempre hora local de pared, nunca UTC (ver
 * dayItem.ts). `new Date(reminderAt)` la interpretaría como UTC y dispararía la
 * notificación a la hora equivocada — hay que armar el Date local a mano.
 */
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

/** Estado real del permiso de notificaciones del sistema — usado por Settings
 * para reflejar/gestionar el permiso de verdad, no un toggle decorativo. */
export async function getNotificationPermissionStatus(): Promise<Notifications.NotificationPermissionsStatus> {
  return Notifications.getPermissionsAsync();
}

/** Pide el permiso — dispara el diálogo nativo del sistema solo si todavía se
 * puede preguntar (`canAskAgain`); si ya lo rechazaron de forma permanente,
 * no hace nada (hay que ir a Ajustes del sistema, ver `Linking.openSettings`
 * desde `SettingsScreen`). */
export async function requestNotificationPermission(): Promise<Notifications.NotificationPermissionsStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !current.canAskAgain) return current;
  return Notifications.requestPermissionsAsync();
}

/**
 * Se llama una vez al arrancar la app (`app/_layout.tsx`). Si el usuario
 * nunca respondió el permiso (`undetermined`), dispara el diálogo nativo del
 * sistema de una vez — así no hace falta esperar a que intente poner un
 * recordatorio para verlo. Si ya está `granted` no hace nada (silencioso); si
 * ya lo rechazó antes, tampoco insiste en cada arranque. Si el diálogo
 * termina en "permitir", sincroniza la preferencia LOCAL
 * (`settingsStore.notificationsEnabled`) a `true` para que el toggle de
 * Ajustes arranque coherente con lo que el usuario acaba de aceptar.
 */
export async function primeNotificationPermissionOnLaunch(): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'undetermined') {
    const requested = await Notifications.requestPermissionsAsync();
    if (requested.granted) useSettingsStore.getState().setNotificationsEnabled(true);
  }
}

/** Cancela cualquier notificación programada previamente para este ítem. */
export async function cancelReminderNotification(itemId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(itemId).catch(() => {});
}

/**
 * Programa (reemplazando cualquier programación previa) la notificación nativa
 * para la hora exacta de `item.reminderAt`. El sentinel `ANY_TIME_HHMM`
 * (recordatorio "Any Time", sin hora puntual) no dispara notificación real,
 * solo el ícono de campana en la lista.
 */
export async function syncReminderNotification(item: DayItem): Promise<void> {
  await cancelReminderNotification(item.id);
  if (!item.reminderAt) return;
  const hhmm = item.reminderAt.slice(11, 16);
  if (hhmm === ANY_TIME_HHMM) return;

  // Preferencia LOCAL del usuario (toggle de Ajustes) — independiente del
  // permiso real del SO, ver `settingsStore.notificationsEnabled`. Apagada,
  // no se programa nada aunque el permiso del sistema siga concedido.
  if (!useSettingsStore.getState().notificationsEnabled) return;

  const date = localDateFromReminderAt(item.reminderAt);
  if (date.getTime() <= Date.now()) return;

  const granted = await ensurePermission();
  if (!granted) return;
  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    identifier: item.id,
    content: { title: item.title, body: translate(useSettingsStore.getState().language, 'notificationBody') },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: ANDROID_CHANNEL_ID },
  });
}
