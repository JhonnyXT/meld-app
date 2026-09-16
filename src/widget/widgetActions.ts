import { dayItemRepository } from '@/data/local/dayItemRepository';
import { toDateKey } from '@/domain/date';

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
  const nextStatus = item.status === 'done' ? 'scheduled' : 'done';
  await dayItemRepository.upsert({ ...item, status: nextStatus, updatedAt: new Date().toISOString() });
}

export async function toggleHabitCompleteFromWidget(id: string): Promise<void> {
  await dayItemRepository.toggleHabitCompletion(id, toDateKey(new Date()));
}
