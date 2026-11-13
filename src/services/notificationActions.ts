import { dayItemRepository } from '@/data/local/dayItemRepository';
import { categoryRepository } from '@/data/local/categoryRepository';
import { toDateKey } from '@/domain/date';
import { refreshWidgets } from '@/widget/refreshWidgets';

async function isReadOnlyCategory(label: string | null): Promise<boolean> {
  if (!label) return false;
  const categories = await categoryRepository.list();
  return categories.find((c) => c.label === label)?.space?.role === 'viewer';
}

export const MARK_DONE_ACTION = 'mark-done';

export async function completeItemFromNotification(itemId: string): Promise<void> {
  const item = await dayItemRepository.getById(itemId);
  if (!item || (await isReadOnlyCategory(item.category))) return;
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
