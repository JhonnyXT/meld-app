import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage } from '@/components/LegalPage';
import { hasLocale } from '@/i18n/config';
import { legalDocs } from '@/legal/docs';

export async function generateMetadata({ params }: PageProps<'/[lang]/privacy'>): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: `${legalDocs.privacy[lang].title} · Meld`,
    alternates: { canonical: `/${lang}/privacy`, languages: { es: '/es/privacy', en: '/en/privacy' } },
  };
}

export default async function Page({ params }: PageProps<'/[lang]/privacy'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <LegalPage doc={legalDocs.privacy[lang]} locale={lang} path="/privacy" />;
}
