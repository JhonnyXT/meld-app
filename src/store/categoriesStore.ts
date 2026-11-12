import { create } from 'zustand';
import { categoryRepository } from '@/data/local/categoryRepository';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { spaceMemberRepository } from '@/data/local/spaceMemberRepository';
import type { Category } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';

export interface CategoryUsage {
  pending: number;
  total: number;
}

interface CategoriesState {
  categories: Category[];
  usage: Record<string, CategoryUsage>;
  readOnlyLabels: Set<string>;
  memberNames: Record<string, string>;
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  add: (input: { label: string; icon: IconName; color: string }) => Promise<void>;
  update: (id: string, patch: { label: string; icon: IconName; color: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

function buildUsage(rows: { category: string; status: 'inbox' | 'scheduled' | 'done' }[]): Record<string, CategoryUsage> {
  const usage: Record<string, CategoryUsage> = {};
  for (const row of rows) {
    const entry = usage[row.category] ?? { pending: 0, total: 0 };
    entry.total += 1;
    if (row.status !== 'done') entry.pending += 1;
    usage[row.category] = entry;
  }
  return usage;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  usage: {},
  readOnlyLabels: new Set(),
  memberNames: {},
  loading: false,
  loaded: false,

  load: async () => {
    set({ loading: true });
    const [categories, usageRows, memberNames] = await Promise.all([
      categoryRepository.list(),
      dayItemRepository.listCategoryUsage(),
      spaceMemberRepository.getAllNames(),
    ]);
    const readOnlyLabels = new Set(categories.filter((c) => c.space?.role === 'viewer').map((c) => c.label));
    set({ categories, usage: buildUsage(usageRows), readOnlyLabels, memberNames, loading: false, loaded: true });
  },

  add: async (input) => {
    await categoryRepository.create(input);
    await get().load();
  },

  update: async (id, patch) => {
    await categoryRepository.update(id, patch);
    await get().load();
  },

  remove: async (id) => {
    await categoryRepository.remove(id);
    await get().load();
  },
}));
