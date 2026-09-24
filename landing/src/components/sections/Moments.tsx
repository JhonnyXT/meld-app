import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { Dictionary } from '@/i18n/config';
import { InlineChip, SectionHead } from './shared';

// Fotos de Wikimedia Commons, descargadas y recortadas a 4:5 en /public/img.
// Dos son CC BY-SA 4.0 (exigen crédito, ver `CREDITS`) y dos de dominio
// público. Si se cambia una foto, actualizar también su crédito.
const CARDS = [
  { src: '/img/place-santorini.jpg', rot: -9, x: 0, y: 26 },
  { src: '/img/place-kyoto.jpg', rot: -3, x: 150, y: 4 },
  { src: '/img/place-moraine.jpg', rot: 3, x: 300, y: 4 },
  { src: '/img/place-fitzroy.jpg', rot: 9, x: 450, y: 26 },
];

const CREDITS = [
  { author: 'Giles Laurent', license: 'CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:1000_Three_domes_of_Oia_in_Santorini_Photo_by_Giles_Laurent.jpg' },
  { author: 'Basile Morin', license: 'CC BY-SA 4.0', href: "https://commons.wikimedia.org/wiki/File:Founder%27s_Hall_gate_of_Higashi-Honganji_Temple,_with_water_reflection,_Kyoto,_Japan.jpg" },
  { author: 'Gorgo', license: null, href: 'https://commons.wikimedia.org/wiki/File:Moraine_Lake_17092005.jpg' },
  { author: 'Prissantenbär', license: null, href: 'https://commons.wikimedia.org/wiki/File:Fitz_Roy_1.jpg' },
];

export function Moments({ t }: { t: Dictionary['moments'] }) {
  return (
    <section id="momentos" className="flex w-full max-w-[760px] scroll-mt-10 flex-col items-center gap-8 px-5 py-16 sm:gap-12 sm:py-28">
      <SectionHead
        title={
          <>
            {t.titleA}
            <InlineChip>
              <span className="text-[29px] font-extrabold sm:text-[44px]">{t.chip}</span>
            </InlineChip>
            {t.titleB}
          </>
        }
        subtitle={t.subtitle}
      />
      {/* El abanico se diseña a 640×320 y se escala en móvil. */}
      <div className="h-[175px] w-[350px] sm:h-[320px] sm:w-[640px]">
        <div className="group relative h-[320px] w-[640px] origin-top-left scale-[0.547] sm:scale-100">
          {CARDS.map((c, i) => (
            <figure
              key={c.src}
              tabIndex={0}
              className="absolute flex w-[190px] rotate-(--rot) cursor-default flex-col items-center gap-2.5 rounded-[20px] bg-surface-2 px-2.5 pt-2.5 pb-3.5 shadow-[0_20px_40px_rgba(0,0,0,0.55)] transition-[rotate,translate,scale,filter,box-shadow] duration-300 ease-out outline-none group-has-[figure:hover]:not-hover:brightness-[0.6] hover:z-10 hover:-translate-y-5 hover:scale-110 hover:rotate-0 hover:shadow-[0_34px_60px_rgba(0,0,0,0.7)] focus-visible:z-10 focus-visible:-translate-y-5 focus-visible:scale-110 focus-visible:rotate-0 focus-visible:ring-2 focus-visible:ring-coral"
              style={{ left: c.x, top: c.y, '--rot': `${c.rot}deg` } as CSSProperties}
            >
              <Image src={c.src} alt={t.cards[i].alt} width={340} height={425} sizes="170px" className="h-[212px] w-[170px] rounded-xl object-cover" />
              <figcaption className="text-[13px] font-semibold text-dim">
                {t.cards[i].place} · {t.cards[i].date}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <p className="max-w-[560px] text-center text-[11px] leading-relaxed text-faint">
        {t.photos}:{' '}
        {CREDITS.map((c, i) => (
          <span key={c.href}>
            <a href={c.href} target="_blank" rel="noopener noreferrer" className="underline decoration-line underline-offset-2 hover:text-dim">
              {c.author}
            </a>{' '}
            ({c.license ?? t.publicDomain}){i < CREDITS.length - 1 ? ', ' : ' '}
          </span>
        ))}
        {t.via}.
      </p>
    </section>
  );
}
