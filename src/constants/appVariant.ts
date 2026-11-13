import Constants from 'expo-constants';

export type AppVariant = 'dev' | 'test' | 'prod';

export const appVariant = (Constants.expoConfig?.extra?.appVariant ?? 'dev') as AppVariant;

export const appVersion = Constants.expoConfig?.version ?? '0.0.0';

export const widgetAppGroup = (Constants.expoConfig?.extra?.widgetAppGroup ?? '') as string;

export const isDev = appVariant === 'dev';
export const isTest = appVariant === 'test';
export const isProd = appVariant === 'prod';
