import { create } from 'zustand';
import { categoryRepository } from '@/data/local/categoryRepository';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { spaceMemberRepository } from '@/data/local/spaceMemberRepository';
import type { Category } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';

/** Uso de una categoría: `pending` = ítems con esa categoría que no están
 * `done` (lo que se muestra como badge numérico), `total` = todos los que la
 * usan (si `total > 0 && pending === 0`, todos están hechos → "Completado"). */
export interface CategoryUsage {
  pending: number;
  total: number;
}

interface CategoriesState {
  categories: Category[];
  usage: Record<string, CategoryUsage>;
  /** Labels de categorías compartidas donde mi rol es `'viewer'` (SYNC_ROADMAP.md, Fase 4) — un
   * lector no puede crear/editar/completar/borrar ahí (gating en `QuickAddSheet`/
   * `ItemDetailSheet`/`TodayItemRow`/widgets). Por `label`, no `id`: es el mismo criterio que
   * `DayItem.category` (texto copiado), consistente con cómo toda la app ya resuelve "a qué
   * categoría pertenece este ítem" (ver CLAUDE.md → "Categorías configurables"). */
  readOnlyLabels: Set<string>;
  /** Caché local `uid -> name` (SYNC_ROADMAP.md, Fase 4 — indicador "quién completó esto"), ver
   * `spaceMemberRepository`. Cargado junto con `categories` para que `TodayItemRow.tsx` resuelva
   * el badge sin un `await` por fila. */
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
