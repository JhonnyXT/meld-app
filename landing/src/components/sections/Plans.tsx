import { Check, Cloud, Heart, LayoutGrid, Link, Sparkles, Timer, type LucideIcon } from 'lucide-react';
import type { Dictionary } from '@/i18n/config';
import { SectionHead } from './shared';

type ProKey = keyof Dictionary['plans']['pro']['items'];
const PRO_ICONS: Record<ProKey, LucideIcon> = {
  health: Heart,
  sync: Cloud,
  calendars: Link,
  ai: Sparkles,
  focus: Timer,
  widgets: LayoutGrid,
};

export function Plans({ t }: { t: Dictionary['plans'] }) {
  return (
    <section id="planes" className="flex w-full max-w-[760px] scroll-mt-10 flex-col items-center gap-8 px-5 py-16 sm:gap-12 sm:py-28">
      <SectionHead title={t.title} subtitle={t.subtitle} />
      <div className="grid w-full grid-cols-1 gap-3.5 sm:gap-[18px] md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-card p-[22px] sm:gap-4 sm:rounded-[22px] sm:p-[30px]">
          <span className="text-base font-bold sm:text-[17px]">{t.free.name}</span>
          <span className="text-[40px] leading-none font-extrabold tracking-[-0.03em] sm:text-[46px]">{t.free.price}</span>
          <span className="text-[13px] text-faint sm:text-sm">{t.free.per}</span>
          <ul className="mt-1 flex flex-col gap-2.5 sm:gap-[11px]">
            {t.free.items.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm sm:text-[15px]">
                <Check size={16} className="shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 rounded-[20px] border border-coral bg-card p-[22px] sm:gap-4 sm:rounded-[22px] sm:p-[30px]">
          <span className="flex items-center justify-between">
            <span className="text-base font-bold text-coral sm:text-[17px]">{t.pro.name}</span>
            <span className="font-mono text-[11px] font-bold text-dim uppercase">{t.pro.soon}</span>
          </span>
          <span className="text-[40px] leading-none font-extrabold tracking-[-0.03em] sm:text-[46px]">
            {t.pro.price}
            <span className="text-[15px] font-medium text-dim sm:text-base"> {t.pro.per}</span>
          </span>
          <span className="text-[13px] text-faint sm:text-sm">{t.pro.alt}</span>
          <ul className="mt-1 flex flex-col gap-2.5 sm:gap-[11px]">
            {(Object.keys(PRO_ICONS) as ProKey[]).map((key) => {
              const Icon = PRO_ICONS[key];
              const item = t.pro.items[key];
              return (
                <li key={key} className="flex items-start gap-2.5 text-sm leading-[1.45] sm:text-[15px]">
                  <Icon size={16} className="mt-0.5 shrink-0 text-coral" aria-hidden />
                  <span>
                    <b className="font-bold">{item.t}.</b> <span className="text-dim">{item.d}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
