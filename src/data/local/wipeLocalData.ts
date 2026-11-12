import * as Notifications from 'expo-notifications';
import { db } from './db';
import { dayItems, habitCompletions, taskCompletions, categories } from './schema';

export async function wipeLocalData(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);

  await db.delete(dayItems);
  await db.delete(habitCompletions);
  await db.delete(taskCompletions);
  await db.delete(categories);

  const now = new Date().toISOString();
  await db.insert(categories).values([
    { id: 'cat-work', label: 'Work', icon: 'briefcase', color: '#4F84FF', sortOrder: 0, updatedAt: now, syncState: 'pending' },
    { id: 'cat-personal', label: 'Personal', icon: 'person', color: '#A55CFF', sortOrder: 1, updatedAt: now, syncState: 'pending' },
    { id: 'cat-health', label: 'Health', icon: 'favorite', color: '#5dde97', sortOrder: 2, updatedAt: now, syncState: 'pending' },
  ]);
}
