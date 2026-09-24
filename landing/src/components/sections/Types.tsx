import { Footprints, Heart, Repeat } from 'lucide-react';
import type { Dictionary } from '@/i18n/config';
import { AppRow, CategoryDot, MonoTag, type ItemType, type RowTime } from '../AppRow';
import { StackedCards } from '../StackedCards';
import { InlineChip, SectionHead } from './shared';

const ROWS: { key: ItemType; time: RowTime }[] = [
  { key: 'task', time: { kind: 'bell' } },
  { key: 'event', time: { kind: 'time', h: '1', m: '00', ap: 'PM' } },
  { key: 'voice', time: { kind: 'dash' } },
  { key: 'moment', time: { kind: 'dash' } },
  { key: 'note', time: { kind: 'time', h: '9', m: '30', ap: 'PM' } },
  { key: 'habit', time: { kind: 'dash' } },
];

export function Types({ t, phone }: { t: Dictionary['types']; phone: Dictionary['phone'] }) {
  return (
    <section id="funciones" className="flex w-full max-w-[760px] scroll-mt-10 flex-col items-center gap-8 px-5 py-16 sm:gap-12 sm:py-28">
      <SectionHead
        title={
          <>
            {t.titleA}
            <InlineChip>
              <Repeat className="size-[18px] text-coral sm:size-6" aria-hidden />
            </InlineChip>
            {t.titleB}
          </>
        }
        subtitle={t.subtitle}
      />
      <StackedCards>
        {ROWS.map(({ key, time }) => {
          const item = t.items[key];
          const trailing =
            key === 'task' ? (
              <CategoryDot label={phone.work} color="#4F9DDE" />
            ) : key === 'event' ? (
              <CategoryDot label={phone.personal} color="#A78BFA" />
            ) : key === 'voice' ? (
              <MonoTag>0:42</MonoTag>
            ) : key === 'habit' ? (
              <Heart size={15} className="shrink-0 text-coral" />
            ) : undefined;
          return (
            <article
              key={key}
              className="relative flex w-full max-w-[560px] flex-col gap-3.5 rounded-[20px] border border-line bg-card shadow-[0_-10px_30px_rgba(0,0,0,0.5)] px-3.5 pt-3.5 pb-5 sm:gap-[18px] sm:rounded-[22px] sm:px-5 sm:pt-[18px] sm:pb-[26px]"
            >
              <AppRow
                time={time}
                type={key}
                title={item.row}
                trailing={trailing}
                lead={key === 'habit' ? <Footprints size={16} className="shrink-0 text-dim" /> : undefined}
              />
              <div className="flex flex-col gap-1.5 pl-[54px] sm:gap-2">
                <h3 className="text-[17px] font-bold sm:text-[19px]">{item.title}</h3>
                <p className="text-sm leading-relaxed text-dim sm:text-[15px]">{item.desc}</p>
              </div>
              {key === 'habit' && (
                <>
                  <p className="pl-[54px] font-hand text-xl leading-tight text-dim lg:hidden">← {t.healthNote}</p>
                  <div className="absolute top-7 left-[calc(100%+24px)] hidden w-[230px] flex-col gap-1 lg:flex">
                    <span className="-rotate-3 font-hand text-[22px] leading-[1.15] text-dim">{t.healthNote}</span>
                    <svg width="70" height="36" viewBox="0 0 70 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-faint" aria-hidden>
                      <path d="M64 4 C 50 26, 30 30, 6 28" />
                      <polyline points="14 22 6 28 14 33" />
                    </svg>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </StackedCards>
    </section>
  );
}
