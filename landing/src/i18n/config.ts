import { en } from './en';
import { es, type Dictionary } from './es';

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

const dictionaries: Record<Locale, Dictionary> = { es, en };

export const hasLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

export type { Dictionary };
