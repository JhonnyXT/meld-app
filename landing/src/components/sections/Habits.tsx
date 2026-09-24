import { Flame } from 'lucide-react';
import type { Dictionary } from '@/i18n/config';
import { InlineChip, SectionHead } from './shared';

const WEEKS = 36;

/** Mapa del año de ejemplo: pseudoaleatorio con semilla fija para que el HTML
 * del servidor y el del cliente coincidan siempre. */
function sampleYear(): ('done' | 'missed' | 'none')[] {
  let seed = 11;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: WEEKS * 7 }, () => {
    const r = rand();
    return r < 0.64 ? 'done' : r < 0.8 ? 'missed' : 'none';
  });
}

const CELL = { done: 'bg-t-habit', missed: 'bg-miss', none: 'bg-surface-2' } as const;

export function Habits({ t }: { t: Dictionary['habits'] }) {
  const days = sampleYear();
  return (
    <section id="habitos" className="flex w-full max-w-[760px] scroll-mt-10 flex-col items-center gap-8 px-5 py-16 sm:gap-12 sm:py-28">
      <SectionHead
        title={
          <>
            {t.titleA}
            <InlineChip>
              <Flame className="size-[18px] text-streak sm:size-6" aria-hidden />
            </InlineChip>
            {t.titleB}
          </>
        }
        subtitle={t.subtitle}
      />
      <div className="flex w-full flex-col gap-[18px] rounded-[20px] border border-line bg-card p-5 sm:gap-[22px] sm:rounded-[22px] sm:p-7">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold sm:text-base">{t.habitName}</span>
          <div className="hidden gap-3.5 text-xs text-faint sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-t-habit" />
              {t.done}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-miss" />
              {t.missed}
            </span>
          </div>
        </div>
        <div className="overflow-hidden">
          <div
            role="img"
            aria-label={t.heatmapLabel}
            className="grid w-max grid-flow-col grid-rows-[repeat(7,12px)] gap-[3px] sm:grid-rows-[repeat(7,14px)] sm:gap-[5px]"
          >
            {days.map((d, i) => (
              <div key={i} className={`size-3 rounded-[3px] sm:size-3.5 sm:rounded ${CELL[d]}`} />
            ))}
          </div>
        </div>
        <div className="flex justify-between sm:justify-start sm:gap-12">
          {t.stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="text-2xl font-extrabold tracking-tight sm:text-[30px]">{s.value}</span>
              <span className="text-xs text-faint sm:text-[13px]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
