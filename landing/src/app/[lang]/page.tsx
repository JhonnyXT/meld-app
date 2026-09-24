import { notFound } from 'next/navigation';
import { DockBar } from '@/components/DockBar';
import { LangToggle } from '@/components/LangToggle';
import { Built } from '@/components/sections/Built';
import { FinalCta } from '@/components/sections/FinalCta';
import { Footer } from '@/components/sections/Footer';
import { Habits } from '@/components/sections/Habits';
import { Hero } from '@/components/sections/Hero';
import { Moments } from '@/components/sections/Moments';
import { Plans } from '@/components/sections/Plans';
import { Screens } from '@/components/sections/Screens';
import { Divider } from '@/components/sections/shared';
import { Types } from '@/components/sections/Types';
import { Voice } from '@/components/sections/Voice';
import { getDictionary, hasLocale } from '@/i18n/config';

const SECTION_IDS = ['top', 'funciones', 'voz', 'momentos', 'habitos', 'detalles', 'pantallas', 'planes'] as const;

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-16 bg-gradient-to-b from-bg to-transparent" />
      <div className="absolute top-4 right-5 z-50 sm:top-7 sm:right-12">
        <LangToggle current={lang} label={t.nav.language} />
      </div>
      <main className="flex flex-col items-center pt-12 pb-28 sm:pt-0">
        <Hero t={t} locale={lang} />
        <Divider />
        <Types t={t.types} phone={t.phone} />
        <Divider />
        <Voice t={t.voice} />
        <Divider />
        <Moments t={t.moments} />
        <Divider />
        <Habits t={t.habits} />
        <Divider />
        <Built t={t.built} />
        <Screens t={t.screens} />
        <Plans t={t.plans} />
        <FinalCta t={t} locale={lang} />
        <Footer t={t.footer} locale={lang} />
      </main>
      <DockBar sections={SECTION_IDS.map((id) => ({ id, label: t.nav.sections[id] }))} labels={t.nav} />
    </>
  );
}
