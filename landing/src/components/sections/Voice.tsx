import { Check } from 'lucide-react';
import type { Dictionary } from '@/i18n/config';
import { Eyebrow } from './shared';
import { VoiceShowcase } from './VoiceShowcase';

export function Voice({ t }: { t: Dictionary['voice'] }) {
  return (
    <section id="voz" className="flex w-full max-w-[1200px] scroll-mt-10 flex-col gap-[22px] px-5 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-28">
      <div className="flex flex-col gap-[22px] lg:w-[520px] lg:gap-7">
        <div className="flex flex-col gap-3 sm:gap-4">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 className="text-[34px] leading-[1.1] font-extrabold tracking-[-0.03em] sm:text-[52px] sm:leading-[1.08]">{t.title}</h2>
          <p className="text-base leading-relaxed text-dim sm:text-[19px]">{t.subtitle}</p>
        </div>
        <ul className="flex flex-col gap-3 sm:gap-3.5">
          {t.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[15px] leading-normal sm:gap-3 sm:text-[17px]">
              <Check size={18} className="mt-0.5 shrink-0 text-coral" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex w-full items-center justify-center rounded-3xl border border-line bg-surface px-[18px] py-7 lg:h-[560px] lg:w-[600px] lg:rounded-[32px]">
        <VoiceShowcase t={t} />
      </div>
    </section>
  );
}
