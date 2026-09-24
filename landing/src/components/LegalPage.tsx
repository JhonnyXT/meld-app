import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getDictionary, type Locale } from '@/i18n/config';
import type { LegalDoc } from '@/legal/docs';
import { LangToggle } from './LangToggle';
import { Footer } from './sections/Footer';

export function LegalPage({ doc, locale, path }: { doc: LegalDoc; locale: Locale; path: string }) {
  const t = getDictionary(locale);
  return (
    <>
      <header className="mx-auto flex w-full max-w-[760px] items-center justify-between px-5 pt-6 sm:pt-8">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 text-sm font-semibold text-dim hover:text-ink">
          <ArrowLeft size={16} aria-hidden />
          <Image src="/img/meld-icon.png" alt="" width={28} height={28} className="rounded-lg" />
          {t.legal.back}
        </Link>
        <LangToggle current={locale} label={t.nav.language} path={path} />
      </header>
      <main className="mx-auto w-full max-w-[760px] px-5 pt-12 pb-16 sm:pt-16">
        <h1 className="text-[34px] leading-tight font-extrabold tracking-[-0.03em] sm:text-5xl">{doc.title}</h1>
        <p className="mt-3 font-mono text-xs text-faint">{doc.updated}</p>
        <div className="mt-8 flex flex-col gap-4 text-base leading-relaxed text-dim">
          {doc.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {doc.sections.map((s) => (
          <section key={s.h} className="mt-10 flex flex-col gap-3">
            <h2 className="text-lg font-bold text-ink sm:text-xl">{s.h}</h2>
            {s.list && (
              <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-dim marker:text-coral">
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            )}
            {s.p?.map((p) => (
              <p key={p} className="text-[15px] leading-relaxed text-dim">
                {p}
              </p>
            ))}
          </section>
        ))}
      </main>
      <Footer t={t.footer} locale={locale} />
    </>
  );
}
