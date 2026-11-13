import * as Notifications from 'expo-notifications';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { toDateKey } from '@/domain/date';

export async function countPendingTasksToday(): Promise<number> {
  const todayKey = toDateKey(new Date());
  const [today, overdue] = await Promise.all([
    dayItemRepository.listByDate(todayKey),
    dayItemRepository.listOverdueTasks(todayKey),
  ]);
  const pendingToday = today.filter((i) => i.type === 'task' && i.status === 'scheduled').length;
  return pendingToday + overdue.length;
}

export async function refreshAppBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(await countPendingTasksToday());
  } catch {}
}
