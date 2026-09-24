import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage } from '@/components/LegalPage';
import { hasLocale } from '@/i18n/config';
import { legalDocs } from '@/legal/docs';

export async function generateMetadata({ params }: PageProps<'/[lang]/terms'>): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    title: `${legalDocs.terms[lang].title} · Meld`,
    alternates: { canonical: `/${lang}/terms`, languages: { es: '/es/terms', en: '/en/terms' } },
  };
}

export default async function Page({ params }: PageProps<'/[lang]/terms'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <LegalPage doc={legalDocs.terms[lang]} locale={lang} path="/terms" />;
}
