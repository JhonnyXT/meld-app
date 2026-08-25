import type { ExpoConfig } from 'expo/config';

// ─── Build variants ─────────────────────────────────────────────────────────
// Patrón portado de my-wallet-app / habit-tracker (ver CLAUDE.md → Build variants).
// Cada variant tiene su propio applicationId — se instalan una al lado de la
// otra en el mismo dispositivo, cada una con su propia base de datos SQLite.
type Variant = 'dev' | 'test' | 'prod';

const variants = {
  // Rebranding de Anchor → Trove (2026-08-21): se migró el applicationId de
  // app.anchor.* a app.trove.* a propósito (decisión explícita del usuario,
  // sabiendo que esto reinstala como app nueva y pierde los datos de prueba
  // que tenía el variant dev con el package viejo) — ver CLAUDE.md → "Build
  // variants" para el historial.
  dev: {
    name: 'Trove (Dev)',
    package: 'app.trove.mobile',
    scheme: 'trove',
    iconBackground: '#121212',
  },
  test: {
    name: 'Trove (Test)',
    package: 'app.trove.mobile.test',
    scheme: 'trove-test',
    iconBackground: '#8B5CF6',
  },
  prod: {
    name: 'Trove',
    package: 'app.trove',
    scheme: 'trove-prod',
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

// `newArchEnabled` es válida en el schema de app.json/app.config pero todavía
// no está en el tipo `ExpoConfig` de este SDK — se extiende el tipo acá en vez
// de perder el chequeo de tipos del resto de la config con un `as any`.
const config: ExpoConfig & { newArchEnabled?: boolean } = {
  name: current.name,
  slug: 'trove-app',
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
      NSMicrophoneUsageDescription: 'Trove usa el micrófono para grabar tus notas de voz.',
      NSPhotoLibraryUsageDescription: 'Trove accede a tus fotos para adjuntarlas a un día o guardarlas como moment.',
      NSCameraUsageDescription: 'Trove usa la cámara para capturar fotos y adjuntarlas a un día.',
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
        photosPermission: 'Trove accede a tus fotos para adjuntarlas a un día o guardarlas como moment.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Trove usa la cámara para capturar fotos y adjuntarlas a un día.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#FF4B66',
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
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appVariant: variant,
  },
};

export default config;
