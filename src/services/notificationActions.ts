import { dayItemRepository } from '@/data/local/dayItemRepository';
import { toDateKey } from '@/domain/date';
import { refreshWidgets } from '@/widget/refreshWidgets';

/** Identificador del botón "Marcar hecho" de la categoría `completable` —
 * vive acá (y no en `notifications.ts`) para que la tarea en segundo plano
 * (`notificationBackgroundTask.ts`) lo use sin cargar los stores de la UI. */
export const MARK_DONE_ACTION = 'mark-done';

/**
 * Acción "Marcar hecho" tocada directo desde la bandeja de notificaciones
 * (ver `services/notifications.ts` → `registerNotificationResponseHandling`
 * y la categoría `COMPLETABLE_CATEGORY`). Solo aplica a Task/Habit — son
 * los únicos tipos con un concepto real de "hecho" en la app.
 *
 * IDEMPOTENTE a propósito (marca hecho, no alterna): si ya estaba
 * completado, no hace nada — tocar la acción dos veces (p. ej. la
 * notificación quedó en pantalla y se vuelve a tocar) nunca debe
 * "desmarcarlo" por accidente.
 *
 * Muta la DB directo, sin pasar por `dayItemsStore` — a propósito, para no
 * crear un require cycle (`notifications.ts` → acá → `dayItemsStore.ts` →
 * `notifications.ts`, Metro avisa de esto si se reintroduce), y porque
 * también corre en la tarea en segundo plano con la app cerrada, donde no
 * hay UI. Si la app está abierta, quien la llama recarga la lista después
 * (ver `registerNotificationResponseHandling`).
 */
export async function completeItemFromNotification(itemId: string): Promise<void> {
  const item = await dayItemRepository.getById(itemId);
  if (!item) return;
  const today = toDateKey(new Date());

  if (item.type === 'task') {
    if (item.repeatRule) {
      const already = await dayItemRepository.listTaskCompletionDates(itemId, today, today);
      if (already.length === 0) await dayItemRepository.toggleTaskCompletion(itemId, today);
    } else if (item.status !== 'done') {
      await dayItemRepository.upsert({ ...item, status: 'done', updatedAt: new Date().toISOString() });
    }
  } else if (item.type === 'habit') {
    const already = await dayItemRepository.listHabitCompletionDates(itemId, today, today);
    if (already.length === 0) await dayItemRepository.toggleHabitCompletion(itemId, today);
  }

  refreshWidgets();
}
