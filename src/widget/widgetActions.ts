import { dayItemRepository } from '@/data/local/dayItemRepository';
import { categoryRepository } from '@/data/local/categoryRepository';
import { toDateKey } from '@/domain/date';

async function isReadOnlyCategory(label: string | null): Promise<boolean> {
  if (!label) return false;
  const categories = await categoryRepository.list();
  return categories.find((c) => c.label === label)?.space?.role === 'viewer';
}

export async function toggleTaskCompleteFromWidget(id: string): Promise<void> {
  const item = await dayItemRepository.getById(id);
  if (!item || item.type !== 'task') return;
  if (await isReadOnlyCategory(item.category)) return;
  const nextStatus = item.status === 'done' ? 'scheduled' : 'done';
  await dayItemRepository.upsert({ ...item, status: nextStatus, updatedAt: new Date().toISOString() });
}

export async function toggleHabitCompleteFromWidget(id: string): Promise<void> {
  const item = await dayItemRepository.getById(id);
  if (!item || (await isReadOnlyCategory(item.category))) return;
  await dayItemRepository.toggleHabitCompletion(id, toDateKey(new Date()));
}
