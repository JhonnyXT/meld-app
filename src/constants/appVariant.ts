import Constants from 'expo-constants';

// Ver CLAUDE.md → Build variants. Leer el variant desde acá, nunca de
// `process.env` directo — `process.env.APP_VARIANT` solo existe en el proceso
// de build (Node, al resolver app.config.ts), no en el runtime de la app.
export type AppVariant = 'dev' | 'test' | 'prod';

export const appVariant = (Constants.expoConfig?.extra?.appVariant ?? 'dev') as AppVariant;

export const appVersion = Constants.expoConfig?.version ?? '0.0.0';

/** App Group compartido con el target de widget de iOS (`targets/widget/`) —
 * ver `src/widget/refreshTodayWidget.ts`. No aplica en Android (usa su
 * propio mecanismo de headless task, sin App Groups). */
export const widgetAppGroup = (Constants.expoConfig?.extra?.widgetAppGroup ?? '') as string;

export const isDev = appVariant === 'dev';
export const isTest = appVariant === 'test';
export const isProd = appVariant === 'prod';
