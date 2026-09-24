'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import type { Dictionary } from '@/i18n/config';
import { SectionHead } from './shared';

const SRC = ['/img/screen-today.png', '/img/screen-inbox.png', '/img/screen-calendar.png', '/img/screen-moments-v2.png'];

/** Carrusel centrado: la tarjeta activa queda en el medio y las demás se ven
 * a los lados, más chicas y apagadas. El relleno lateral de media pantalla
 * hace que SIEMPRE haya algo que desplazar (antes, en pantallas anchas, las 4
 * tarjetas entraban completas y las flechas no movían nada). Flechas, puntos,
 * teclado (← →) y deslizar mueven el mismo scroll con snap. */
export function Screens({ t }: { t: Dictionary['screens'] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const cards = () => Array.from(scroller.current?.children ?? []) as HTMLElement[];

  const goTo = (i: number) => {
    const el = scroller.current;
    const card = cards()[Math.max(0, Math.min(SRC.length - 1, i))];
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let nearest = 0;
    cards().forEach((card, i) => {
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      const best = Math.abs(cards()[nearest].offsetLeft + cards()[nearest].offsetWidth / 2 - center);
      if (d < best) nearest = i;
    });
    setActive(nearest);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(active + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(active - 1);
    }
  };

  return (
    <section id="pantallas" className="flex w-full scroll-mt-10 flex-col items-center gap-[26px] border-y border-line bg-sunken py-16 sm:gap-10 sm:py-28">
      <div className="px-5">
        <SectionHead title={t.title} subtitle={t.subtitle} />
      </div>
      <div
        ref={scroller}
        role="region"
        aria-roledescription="carousel"
        aria-label={t.title}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        className="relative flex w-full snap-x snap-mandatory gap-3.5 overflow-x-auto px-[calc(50%-125px)] outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-coral sm:gap-6 sm:px-[calc(50%-150px)] [&::-webkit-scrollbar]:hidden"
      >
        {t.items.map((item, i) => (
          <div
            key={SRC[i]}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${SRC.length}`}
            onClick={() => i !== active && goTo(i)}
            className={`flex h-[470px] w-[250px] shrink-0 snap-center flex-col items-center overflow-hidden rounded-[22px] border border-line bg-surface pt-[26px] transition-[scale,opacity] duration-300 ease-out sm:h-[560px] sm:w-[300px] sm:rounded-[26px] sm:pt-[34px] ${
              i === active ? 'scale-100 opacity-100' : 'scale-[0.9] cursor-pointer opacity-45'
            }`}
          >
            <p className="text-center text-[23px] leading-[1.15] font-extrabold tracking-tight sm:text-[28px]">
              {item.a}
              <br />
              <span className="text-mute">{item.b}</span>
            </p>
            <Image
              src={SRC[i]}
              alt={item.alt}
              width={330}
              height={495}
              className="mt-3 h-[405px] w-[270px] object-contain sm:mt-3.5 sm:h-[495px] sm:w-[330px]"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          aria-label={t.prev}
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface-2 text-ink transition-colors hover:bg-line disabled:cursor-default disabled:bg-surface disabled:text-faint"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex gap-1.5">
          {SRC.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`${t.goTo} ${i + 1}`}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => goTo(i)}
              className="flex h-6 cursor-pointer items-center px-0.5"
            >
              <span className={`block h-1.5 rounded-sm transition-all ${i === active ? 'w-[18px] bg-ink' : 'w-1.5 bg-[#4a4a50]'}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label={t.next}
          onClick={() => goTo(active + 1)}
          disabled={active === SRC.length - 1}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface-2 text-ink transition-colors hover:bg-line disabled:cursor-default disabled:bg-surface disabled:text-faint"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
