// Target de WidgetKit "Hoy" (Fase 2 del roadmap Free — ver CLAUDE.md →
// "Roadmap"). Generado por `@bacons/apple-targets` en `expo prebuild -p ios`.
//
// SIN VERIFICAR: este proyecto se desarrolla en un entorno Linux sin
// Xcode/macOS, así que este target nunca se pudo compilar ni ver
// funcionando en un simulador/dispositivo real — a diferencia del widget de
// Android (`react-native-android-widget`), que sí está probado en
// dispositivo. Antes de dar esto por terminado hace falta abrir el proyecto
// en una Mac (`npx expo prebuild -p ios --clean` y después `xed ios`),
// confirmar que el target compila, y probar el widget en un simulador/
// dispositivo real.
//
// El App Group tiene que coincidir con `widgetAppGroup` de `app.config.ts`
// (ahí se arma como `group.<bundleIdentifier>.widget`, un valor distinto
// por build variant, igual que el resto del aislamiento dev/test/prod).
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'today_widget',
  displayName: 'Meld — Hoy',
  colors: {
    $accent: '#FF4B66',
    $widgetBackground: '#1C1C1E',
  },
  frameworks: ['SwiftUI'],
  entitlements: {
    'com.apple.security.application-groups': config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [],
  },
});
