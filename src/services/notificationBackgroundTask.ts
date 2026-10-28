import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { initDb } from '@/data/local/db';
import { completeItemFromNotification, MARK_DONE_ACTION } from './notificationActions';

const TASK_NAME = 'meld-notification-actions';

/** Con la app cerrada el payload llega serializado por Android: en vez de
 * `content.data` trae `content.dataString` (el JSON de `data`, al mismo nivel
 * que `title`/`body`, no adentro de `data`). Se aceptan las dos formas. */
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

/**
 * "Marcar hecho" SIN abrir la app (pedido explícito del usuario, "como
 * WhatsApp"). Con `opensAppToForeground: false`, Android no trae la app al
 * frente y, si está en segundo plano o cerrada, `expo-notifications` corre
 * esta tarea de `expo-task-manager` en un proceso JS headless — así el botón
 * funciona aunque Android haya matado la app. Con la app en primer plano la
 * tarea NO corre: ahí lo atiende el listener de
 * `registerNotificationResponseHandling`. Solo Android: en iOS la acción
 * sigue llegando al listener.
 *
 * Definida y registrada en el scope del módulo, importado desde `index.js`
 * antes que nada (igual que el headless task del widget), porque el proceso
 * headless no monta ningún componente.
 */
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
