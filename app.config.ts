import { existsSync, readFileSync } from 'fs';
import type { ExpoConfig } from 'expo/config';
import { webClientIdFrom } from './firebase/googleServices';

type Variant = 'dev' | 'test' | 'prod';

const variants = {
  dev: {
    name: 'Meld (Dev)',
    package: 'app.meld.mobile',
    scheme: 'meld',
  },
  test: {
    name: 'Meld (Test)',
    package: 'app.meld.mobile.test',
    scheme: 'meld-test',
  },
  prod: {
    name: 'Meld',
    package: 'app.meld',
    scheme: 'meld-prod',
  },
} as const satisfies Record<Variant, unknown>;

function resolveVariant(): Variant {
  const value = process.env.APP_VARIANT ?? 'dev';
  if (value in variants) return value as Variant;
  throw new Error(`Unknown APP_VARIANT "${value}". Expected one of: ${Object.keys(variants).join(', ')}`);
}

const variant = resolveVariant();
const current = variants[variant];

const widgetAppGroup = `group.${current.package}.widget`;

const googleServicesFile =
  variant === 'prod' ? './firebase/google-services.prod.json' : './firebase/google-services.test.json';

const googleWebClientId = existsSync(googleServicesFile)
  ? webClientIdFrom(JSON.parse(readFileSync(googleServicesFile, 'utf8')), current.package)
  : undefined;

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
    googleServicesFile,
    adaptiveIcon: {
      backgroundColor: '#050508',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['RECORD_AUDIO', 'POST_NOTIFICATIONS', 'SCHEDULE_EXACT_ALARM'],
    blockedPermissions: [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
    ],
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
        cameraPermission: false,
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
            maxResizeWidth: '400dp',
            maxResizeHeight: '400dp',
            updatePeriodMillis: 1800000,
          },
          {
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
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-google-signin/google-signin',
    [
      'expo-build-properties',
      {
        // ver docs/adr/0022-kotlin-version-fijada-por-firebase-auth.md
        android: { kotlinVersion: '2.2.20' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appVariant: variant,
    widgetAppGroup,
    googleWebClientId,
    eas: {
      projectId: '0bdd091e-25d8-4d30-9f44-94544b38c6ea',
    },
  },
};

export default config;
