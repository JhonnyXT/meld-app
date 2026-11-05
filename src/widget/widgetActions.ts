import { dayItemRepository } from '@/data/local/dayItemRepository';
import { categoryRepository } from '@/data/local/categoryRepository';
import { toDateKey } from '@/domain/date';

/** Lector de una categoría compartida (SYNC_ROADMAP.md, Fase 4) — no puede completar acá
 * tampoco. Sin store (corre headless, ver el comentario de arriba): consulta el repositorio
 * directo, por `label` (mismo criterio que `categoriesStore.readOnlyLabels`). */
async function isReadOnlyCategory(label: string | null): Promise<boolean> {
  if (!label) return false;
  const categories = await categoryRepository.list();
  return categories.find((c) => c.label === label)?.space?.role === 'viewer';
}

/** Acciones que se disparan tocando un elemento puntual dentro del widget
 * (checkbox de una task, ícono de un hábito) — a diferencia del resto del
 * widget, que abre la app (`clickAction="OPEN_APP"` en la raíz), estas
 * mutan la DB directo y listo, sin necesidad de abrir nada. Se llaman desde
 * `registerWidgetTask.ts` cuando `widgetAction === 'WIDGET_CLICK'` con un
 * `clickAction` custom (`"TOGGLE_TASK"`/`"TOGGLE_HABIT"`, no confundir con
 * los valores especiales `"OPEN_APP"`/`"OPEN_URI"` de la librería, esos
 * nunca llegan a JS).
 *
 * Mismo comportamiento que sus equivalentes en `dayItemsStore.ts`
 * (`toggleComplete`/`toggleHabitComplete`), reimplementado acá sin
 * depender del store porque corre en el headless task de Android — no hay
 * Undo/snackbar (no hay UI para mostrarlo ahí), la única forma de deshacer
 * es tocar de nuevo. Si la app está abierta en foreground al mismo tiempo,
 * su store no se entera de este cambio hasta el próximo `reload()` (foco de
 * pantalla) — lee la DB, que ya queda correcta. */

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
