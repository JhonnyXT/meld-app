import { useSettingsStore } from '@/store/settingsStore';
import { es, en, type Language } from './translations';

export type { Language };
export type TranslationKey = keyof typeof es;

const dictionaries: Record<Language, Record<TranslationKey, string>> = { es, en };

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}

export function translate(lang: Language, key: TranslationKey, params?: Record<string, string | number>): string {
  return interpolate(dictionaries[lang][key], params);
}

/** `const { t, lang } = useTranslation();` — reactivo a `settingsStore.language`. */
export function useTranslation() {
  const lang = useSettingsStore((s) => s.language);
  const t = (key: TranslationKey, params?: Record<string, string | number>) => translate(lang, key, params);
  return { t, lang };
}
