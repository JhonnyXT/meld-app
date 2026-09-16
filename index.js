// Entry point custom (reemplaza el `"main": "expo-router/entry"` directo de
// `package.json`) — el headless task del widget de Android
// (`AppRegistry.registerHeadlessTask`, ver `src/widget/registerWidgetTask.ts`)
// necesita quedar registrado apenas arranca el proceso JS, sin depender de
// que la app llegue a montar ningún componente (el sistema puede lanzar este
// proceso solo para actualizar el widget, con la app cerrada). Se importa
// ANTES de `expo-router/entry` a propósito.
import './src/widget/registerWidgetTask';
import 'expo-router/entry';
