import type { Language } from '@/i18n/translations';

export const SITE_URL = 'https://usemeld.vercel.app';
export const CONTACT_EMAIL = 'jonathanblandon1017@gmail.com';

export const termsUrl = (lang: Language) => `${SITE_URL}/${lang}/terms`;
export const privacyUrl = (lang: Language) => `${SITE_URL}/${lang}/privacy`;
