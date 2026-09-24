import { Platform } from 'react-native';
import { getTodayWidgetData } from './todayWidgetData';
import { getHabitsWidgetData } from './habitsWidgetData';
import { WIDGET_NAMES, buildAndroidWidgetTree } from './androidWidgetTree';
import { widgetAppGroup } from '@/constants/appVariant';
import { refreshAppBadge } from '@/services/appBadge';

/** Llamar después de cualquier mutación que pueda cambiar lo que se ve en
 * alguno de los 4 widgets (`WIDGET_NAMES`: Hoy/Agregar rápido/Progreso/
 * Hábitos — crear/editar/borrar un ítem de hoy, completar una task/hábito).
 * Es "fire and forget" — nunca debe romper el flujo de guardado si un
 * widget falla por algún motivo (dispositivo sin ese widget agregado,
 * plugin no linkeado, etc.), por eso todo el cuerpo va en un try/catch
 * silencioso. Cablear un caso nuevo de mutación es agregar UNA llamada acá,
 * no reinventar la lógica de refresco en cada store.
 *
 * "Agregar rápido" queda afuera a propósito — es estático (no muestra datos
 * de la DB), así que nunca necesita refrescarse por una mutación. */
export async function refreshWidgets(): Promise<void> {
  // El contador del ícono de la app depende de los mismos datos (tareas
  // pendientes de hoy), así que se engancha acá y hereda todos los puntos de
  // mutación que ya llaman a `refreshWidgets`.
  refreshAppBadge();
  try {
    if (Platform.OS === 'android') {
      const { requestWidgetUpdate } = require('react-native-android-widget');
      await Promise.all(
        [WIDGET_NAMES.today, WIDGET_NAMES.habits, WIDGET_NAMES.progress].map((widgetName) =>
          requestWidgetUpdate({
            widgetName,
            renderWidget: (info: { width?: number; height?: number }) => buildAndroidWidgetTree(widgetName, info),
          }),
        ),
      );
      return;
    }
    if (Platform.OS === 'ios') {
      // SIN VERIFICAR — este entorno no tiene Xcode/macOS para compilar ni
      // probar el target de WidgetKit (ver `targets/widget/` y CLAUDE.md →
      // "Roadmap" → widget). `ExtensionStorage` viene de `@bacons/apple-
      // targets`; si `widgetAppGroup` viniera vacío (entitlement no
      // generado todavía, p. ej. sin haber corrido `expo prebuild -p ios`)
      // no tiene sentido intentar escribir.
      if (!widgetAppGroup) return;
      const { ExtensionStorage } = require('@bacons/apple-targets');
      const storage = new ExtensionStorage(widgetAppGroup);

      const today = await getTodayWidgetData();
      storage.set('todayDateKey', today.dateKey);
      storage.set('todayDoneCount', today.doneCount);
      storage.set('todayTotalCount', today.totalCount);
      storage.set('todayItems', today.items);

      const habits = await getHabitsWidgetData();
      storage.set('habitsDoneCount', habits.doneCount);
      storage.set('habitsTotalCount', habits.totalCount);
      // `ExtensionStorage.set` solo acepta string/number en los valores —
      // `completedToday` (boolean) no lo usa el lado iOS, se descarta acá.
      storage.set(
        'habitsRows',
        habits.rows.map((row) => ({ id: row.id, title: row.title, progress: row.progress, streak: row.streak })),
      );

      ExtensionStorage.reloadWidget(WIDGET_NAMES.today);
      ExtensionStorage.reloadWidget(WIDGET_NAMES.habits);
      ExtensionStorage.reloadWidget(WIDGET_NAMES.progress);
    }
  } catch {
    // Nunca debe tumbar la mutación que lo disparó.
  }
}
