import { Platform } from 'react-native';
import { initDb } from '@/data/local/db';

/** Solo se registra en Android — `react-native-android-widget` es la única
 * pieza que necesita un headless task (para actualizar el widget cuando el
 * sistema lo agrega/redimensiona mientras la app está cerrada). Importado
 * desde `index.js` (entry point custom, ver ese archivo) ANTES de
 * `expo-router/entry`, así el `AppRegistry.registerHeadlessTask` queda
 * registrado apenas arranca el proceso JS, sin depender de que la app
 * llegue a montar ningún componente. */
if (Platform.OS === 'android') {
  // Import diferido (no top-level) para no cargar la librería en iOS, donde
  // no está instalado el módulo nativo correspondiente.
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { buildAndroidWidgetTree } = require('./androidWidgetTree');
  const { toggleTaskCompleteFromWidget, toggleHabitCompleteFromWidget } = require('./widgetActions');

  registerWidgetTaskHandler(
    async ({
      widgetAction,
      widgetInfo,
      renderWidget,
      clickAction,
      clickActionData,
    }: {
      widgetAction: string;
      widgetInfo: { widgetName: string; width?: number; height?: number };
      renderWidget: (el: unknown) => void;
      clickAction?: string;
      clickActionData?: Record<string, unknown>;
    }) => {
      // La librería anida `widgetName`/`width`/`height` dentro de
      // `widgetInfo`, no en el nivel superior del payload — desestructurarlos
      // directo (como antes) los deja `undefined`, el `switch` de
      // `buildAndroidWidgetTree` cae siempre al `default` y los 4 widgets
      // renderizan el contenido de "Hoy" sin importar cuál se agregó (bug
      // real, encontrado al agregar los widgets al home real).
      const { widgetName, width, height } = widgetInfo;
      if (widgetAction === 'WIDGET_DELETED') return;
      // `CREATE TABLE IF NOT EXISTS` es idempotente — se llama acá también
      // porque este handler puede correr sin que `app/_layout.tsx` (que es
      // quien normalmente llama `initDb()`) haya montado nunca, si el sistema
      // agrega/actualiza el widget con la app completamente cerrada.
      initDb();

      // `WIDGET_CLICK` con un `clickAction` custom (no `OPEN_APP`/`OPEN_URI`
      // — esos los maneja el sistema nativo y nunca llegan acá) es el
      // checkbox de una task o el ícono de un hábito, ver
      // `TodayAndroidWidget.tsx`/`HabitsAndroidWidget.tsx` y
      // `widgetActions.ts`. Mutar y re-renderizar EN EL MISMO handler deja
      // el widget actualizado al instante, sin abrir la app.
      if (widgetAction === 'WIDGET_CLICK') {
        const id = clickActionData?.id;
        if (clickAction === 'TOGGLE_TASK' && typeof id === 'string') {
          await toggleTaskCompleteFromWidget(id);
        } else if (clickAction === 'TOGGLE_HABIT' && typeof id === 'string') {
          await toggleHabitCompleteFromWidget(id);
        }
      }

      // Un solo handler cubre los 4 tipos de widget (`WIDGET_NAMES` en
      // `androidWidgetTree.ts`) — `widgetName` dice cuál. `WIDGET_RESIZED`
      // trae el `width`/`height` NUEVO, para que `pickVisibleItemCount`
      // recalcule cuántos ítems entran ahora ("Hoy"/"Hábitos", los únicos
      // dos que se pueden redimensionar).
      const tree = await buildAndroidWidgetTree(widgetName, { width, height });
      renderWidget(tree);
    },
  );
}
