import type { Metadata, Viewport } from 'next';
import { Caveat, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getDictionary, hasLocale, locales } from '@/i18n/config';
import '../globals.css';

// Mismas fuentes que la app (Plus Jakarta Sans + JetBrains Mono); Caveat solo
// para las notas "escritas a mano".
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-jetbrains' });
const caveat = Caveat({ subsets: ['latin'], weight: ['600'], variable: '--font-caveat' });

// Solo /es y /en existen; cualquier otro prefijo es 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = { themeColor: '#121212', colorScheme: 'dark' };

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: t.meta.title,
    description: t.meta.description,
    alternates: { canonical: `/${lang}`, languages: { es: '/es', en: '/en', 'x-default': '/es' } },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      locale: lang === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
      siteName: 'Meld',
      images: [{ url: '/img/meld-icon.png', width: 1024, height: 1024, alt: 'Meld' }],
    },
    twitter: { card: 'summary', title: t.meta.title, description: t.meta.description },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html lang={lang} className={`${jakarta.variable} ${jetbrains.variable} ${caveat.variable}`}>
      <body className="bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
