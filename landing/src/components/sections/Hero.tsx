import Image from 'next/image';
import type { Dictionary, Locale } from '@/i18n/config';
import { DemoHero } from '@/demo/DemoHero';
import { WaitlistForm } from '../WaitlistForm';

export function Hero({ t, locale }: { t: Dictionary; locale: Locale }) {
  return (
    <section id="top" className="flex w-full scroll-mt-10 flex-col items-center px-5 pt-5 text-center sm:pt-16">
      <div className="relative mb-[22px] size-[84px] sm:mb-7 sm:size-28">
        <div className="absolute -top-2 -left-8 size-[152px] rounded-full bg-[radial-gradient(circle,rgba(255,75,102,0.35)_0%,rgba(255,75,102,0)_65%)] sm:-top-2.5 sm:-left-10 sm:size-48" />
        <Image
          src="/img/meld-icon.png"
          alt={t.hero.iconAlt}
          width={112}
          height={112}
          priority
          className="relative size-[84px] rounded-[20px] sm:size-28 sm:rounded-[26px]"
        />
      </div>
      <h1 className="text-[50px] leading-[1.05] font-extrabold tracking-[-0.045em] sm:text-[92px] sm:leading-[1.04]">
        {t.hero.title1}
        <br />
        <span className="text-mute">{t.hero.title2}</span>
      </h1>
      <p className="mt-[18px] max-w-[560px] text-[17px] leading-relaxed text-dim sm:mt-[26px] sm:text-xl">{t.hero.subtitle}</p>
      <div id="unirme" className="mt-[26px] flex w-full scroll-mt-24 justify-center sm:mt-8">
        <WaitlistForm t={t.waitlist} locale={locale} />
      </div>
      <p className="mt-3 text-[13px] leading-normal text-faint sm:mt-3.5 sm:text-sm">
        {t.hero.finePrint}
        <span className="hidden sm:inline">
          {' · '}
          <a href="#planes" className="text-dim underline hover:text-ink">
            {t.hero.freeForever}
          </a>
        </span>
      </p>

      <div className="mt-10 flex w-full justify-center sm:mt-16">
        <DemoHero locale={locale} widgetsNote={t.hero.widgetsNote} />
      </div>
    </section>
  );
}
