import type { ExpoConfig } from 'expo/config';

// ─── Build variants ─────────────────────────────────────────────────────────
// Patrón portado de my-wallet-app / habit-tracker (ver CLAUDE.md → Build variants).
// Cada variant tiene su propio applicationId — se instalan una al lado de la
// otra en el mismo dispositivo, cada una con su propia base de datos SQLite.
type Variant = 'dev' | 'test' | 'prod';

const variants = {
  // Rebranding Anchor → Trove (2026-08-21) → Meld (2026-08-27): cada rename
  // migró el applicationId a un namespace nuevo a propósito (decisión
  // explícita del usuario, sabiendo que esto reinstala como app nueva y
  // pierde los datos de prueba que tenía el variant dev con el package
  // viejo) — ver CLAUDE.md → "Build variants" para el historial completo.
  dev: {
    name: 'Meld (Dev)',
    package: 'app.meld.mobile',
    scheme: 'meld',
    iconBackground: '#121212',
  },
  test: {
    name: 'Meld (Test)',
    package: 'app.meld.mobile.test',
    scheme: 'meld-test',
    iconBackground: '#8B5CF6',
  },
  prod: {
    name: 'Meld',
    package: 'app.meld',
    scheme: 'meld-prod',
    iconBackground: '#FF4B66',
  },
} as const satisfies Record<Variant, unknown>;

function resolveVariant(): Variant {
  const value = process.env.APP_VARIANT ?? 'dev';
  if (value in variants) return value as Variant;
  throw new Error(`Unknown APP_VARIANT "${value}". Expected one of: ${Object.keys(variants).join(', ')}`);
}

const variant = resolveVariant();
const current = variants[variant];

// App Group para compartir datos entre la app y el widget de iOS (WidgetKit
// no puede leer la DB SQLite de la app directo — la app escribe un JSON
// resumido acá vía `ExtensionStorage`, ver `src/widget/refreshTodayWidget.ts`).
// Uno por variant, como el resto del aislamiento entre dev/test/prod.
const widgetAppGroup = `group.${current.package}.widget`;

// `newArchEnabled` es válida en el schema de app.json/app.config pero todavía
// no está en el tipo `ExpoConfig` de este SDK — se extiende el tipo acá en vez
// de perder el chequeo de tipos del resto de la config con un `as any`.
const config: ExpoConfig & { newArchEnabled?: boolean } = {
  name: current.name,
  slug: 'meld-app',
  scheme: current.scheme,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: current.package,
    infoPlist: {
      NSMicrophoneUsageDescription: 'Meld usa el micrófono para grabar tus notas de voz.',
      NSPhotoLibraryUsageDescription: 'Meld accede a tus fotos para adjuntarlas a un día o guardarlas como moment.',
      NSCameraUsageDescription: 'Meld usa la cámara para capturar fotos y adjuntarlas a un día.',
    },
    entitlements: {
      'com.apple.security.application-groups': [widgetAppGroup],
    },
  },
  android: {
    package: current.package,
    adaptiveIcon: {
      backgroundColor: current.iconBackground,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // SCHEDULE_EXACT_ALARM: sin esto, expo-notifications cae a alarmas NO
    // exactas (AlarmManagerCompat.setAndAllowWhileIdle en vez de
    // setExactAndAllowWhileIdle) y Doze mode puede demorar un recordatorio
    // con hora puntual varios minutos — ver CLAUDE.md → "Doze mode".
    permissions: ['RECORD_AUDIO', 'CAMERA', 'READ_MEDIA_IMAGES', 'POST_NOTIFICATIONS', 'SCHEDULE_EXACT_ALARM'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-status-bar',
    'expo-audio',
    [
      'expo-image-picker',
      {
        photosPermission: 'Meld accede a tus fotos para adjuntarlas a un día o guardarlas como moment.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Meld usa la cámara para capturar fotos y adjuntarlas a un día.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#FF4B66',
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Meld usa el micrófono para dictar el título de un ítem por voz.',
        speechRecognitionPermission: 'Meld usa reconocimiento de voz para convertir lo que dices en texto.',
      },
    ],
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: '#121212',
      },
    ],
    // Widget básico "Hoy" (Fase 2 del roadmap Free, ver CLAUDE.md → "Roadmap").
    // Android: `react-native-android-widget` (Glance/Jetpack, real y probado
    // en dispositivo). iOS: `@bacons/apple-targets` genera el target de
    // WidgetKit — este entorno no tiene Xcode/macOS, así que el lado iOS
    // queda SIN VERIFICAR (no se pudo compilar ni ver funcionando acá,
    // decisión explícita del usuario de agregarlo igual) — ver
    // `targets/widget/`.
    [
      'react-native-android-widget',
      {
        widgets: [
          {
            name: 'TodayWidget',
            label: 'Meld — Hoy',
            description: 'Lista de lo que tienes agendado hoy.',
            minWidth: '250dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            resizeMode: 'horizontal|vertical',
            // El contenido se adapta al tamaño real (ver `androidWidgetTree.ts`
            // → `pickVisibleItemCount`, corrige el espacio vacío que quedaba
            // al agrandar el widget), pero igual conviene un techo — sin esto
            // Android permite arrastrarlo casi a pantalla completa.
            maxResizeWidth: '400dp',
            maxResizeHeight: '400dp',
            // Mínimo permitido por la librería (30 min) — además de esto, la
            // app dispara una actualización inmediata en foreground cada vez
            // que cambian los ítems de hoy (`refreshWidgets`), así que este
            // período es solo el respaldo para cuando la app está cerrada.
            updatePeriodMillis: 1800000,
          },
          {
            // Widget chico y estático — abre Quick Add directo (deep link,
            // ver `app/_layout.tsx` → `handleDeepLink`), nunca necesita
            // refrescarse por datos, así que sin `updatePeriodMillis`.
            name: 'QuickAddWidget',
            label: 'Meld — Agregar rápido',
            description: 'Un toque para agregar algo, sin abrir la app primero.',
            minWidth: '110dp',
            minHeight: '110dp',
            targetCellWidth: 2,
            targetCellHeight: 2,
            resizeMode: 'none',
          },
          {
            name: 'ProgressWidget',
            label: 'Meld — Progreso del día',
            description: 'Cuánto llevas hecho hoy, de un vistazo.',
            minWidth: '110dp',
            minHeight: '110dp',
            targetCellWidth: 2,
            targetCellHeight: 2,
            resizeMode: 'none',
            updatePeriodMillis: 1800000,
          },
          {
            name: 'HabitsWidget',
            label: 'Meld — Hábitos',
            description: 'Tus hábitos de hoy, con racha y progreso semanal.',
            minWidth: '250dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            resizeMode: 'horizontal|vertical',
            maxResizeWidth: '400dp',
            maxResizeHeight: '400dp',
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
    '@bacons/apple-targets',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appVariant: variant,
    widgetAppGroup,
    // Proyecto de EAS (creado en expo.dev). Como `app.config.ts` es dinámico,
    // `eas init` no puede escribir esto solo — va acá a mano. El mismo
    // projectId sirve para los 3 variants (dev/test/prod); lo que los separa
    // sigue siendo el `applicationId` de cada uno.
    eas: {
      projectId: '0bdd091e-25d8-4d30-9f44-94544b38c6ea',
    },
  },
};

export default config;
