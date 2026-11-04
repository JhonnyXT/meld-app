/**
 * Borra TODO lo local (SYNC_ROADMAP.md, Fase 3, T8 — "Cerrar sesión con Mantener/Borrar"). Solo se
 * llama cuando el usuario elige explícitamente "Borrar de este teléfono" al cerrar sesión, y el
 * caller ya verificó `pendingChanges() === 0` (si hay algo sin subir, no se ofrece — se perdería
 * sin aviso). Deja el teléfono como una instalación nueva: las 4 tablas vacías, las 3 categorías
 * default re-sembradas (mismo criterio que `db.ts` en una instalación nueva) y sin notificaciones
 * colgadas. No toca el cursor de sync (`src/sync/metaStore.ts`) — eso es responsabilidad de quien
 * llama, en `src/sync/`, para no hacer que este archivo dependa de ese paquete (Regla #3).
 */
import * as Notifications from 'expo-notifications';
import { db } from './db';
import { dayItems, habitCompletions, taskCompletions, categories } from './schema';

export async function wipeLocalData(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);

  await db.delete(dayItems);
  await db.delete(habitCompletions);
  await db.delete(taskCompletions);
  await db.delete(categories);

  // Mismas 3 categorías default que `db.ts` siembra en una instalación nueva — sin esto el
  // usuario queda con el picker de Categoría vacío hasta crear una a mano.
  const now = new Date().toISOString();
  await db.insert(categories).values([
    { id: 'cat-work', label: 'Work', icon: 'briefcase', color: '#4F84FF', sortOrder: 0, updatedAt: now, syncState: 'pending' },
    { id: 'cat-personal', label: 'Personal', icon: 'person', color: '#A55CFF', sortOrder: 1, updatedAt: now, syncState: 'pending' },
    { id: 'cat-health', label: 'Health', icon: 'favorite', color: '#5dde97', sortOrder: 2, updatedAt: now, syncState: 'pending' },
  ]);
}
