import * as Notifications from 'expo-notifications';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { toDateKey } from '@/domain/date';

/** Tareas pendientes de hoy: las de hoy sin completar + las atrasadas que
 * Today "adelanta" por rollover (`listOverdueTasks`, ver CLAUDE.md →
 * "Tareas atrasadas") — mismo criterio que lo que el usuario ve pendiente en
 * Today. Solo Task (el único tipo con checkbox real). */
export async function countPendingTasksToday(): Promise<number> {
  const todayKey = toDateKey(new Date());
  const [today, overdue] = await Promise.all([
    dayItemRepository.listByDate(todayKey),
    dayItemRepository.listOverdueTasks(todayKey),
  ]);
  const pendingToday = today.filter((i) => i.type === 'task' && i.status === 'scheduled').length;
  return pendingToday + overdue.length;
}

/** Contador sobre el ícono de la app. Android: `expo-notifications` usa
 * ShortcutBadger por debajo — solo lo muestran los launchers que soportan
 * badges numéricos (Samsung One UI, etc.); el launcher de Pixel/Moto solo
 * pinta un punto cuando hay notificaciones y lo ignora. iOS: necesita el
 * permiso de notificaciones (con badge). Fire-and-forget como
 * `refreshWidgets`: nunca debe romper la mutación que lo disparó. */
export async function refreshAppBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(await countPendingTasksToday());
  } catch {
    // Launcher sin soporte / módulo no disponible — no es un error real.
  }
}
