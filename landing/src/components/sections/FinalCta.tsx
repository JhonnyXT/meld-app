import type { Dictionary, Locale } from '@/i18n/config';
import { WaitlistForm } from '../WaitlistForm';

export function FinalCta({ t, locale }: { t: Dictionary; locale: Locale }) {
  return (
    <section className="w-full max-w-[760px] px-5 pt-6 pb-14 sm:pt-10 sm:pb-24">
      <div className="flex flex-col items-center gap-[18px] rounded-3xl border border-line bg-surface px-[18px] py-[34px] text-center sm:gap-[22px] sm:rounded-[28px] sm:px-10 sm:py-14">
        <h2 className="text-[30px] leading-[1.2] font-extrabold tracking-[-0.03em] sm:text-[46px] sm:leading-[1.15]">
          {t.cta.titleA}
          <br />
          <span className="text-mute">{t.cta.titleB}</span>
        </h2>
        <WaitlistForm t={t.waitlist} locale={locale} note={t.cta.note} />
      </div>
    </section>
  );
}
