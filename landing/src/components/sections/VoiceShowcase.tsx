'use client';

import { Calendar, Check, Mic, Repeat } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Dictionary } from '@/i18n/config';

const TYPE_ICON = { task: Check, event: Calendar, habit: Repeat } as const;
const TYPE_COLOR = { task: 'text-t-task', event: 'text-t-event', habit: 'text-t-habit' } as const;

const reducedMotionQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribeReducedMotion = (onChange: () => void) => {
  const mq = reducedMotionQuery();
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};

const WORD_MS = 230; // cada palabra "dictada"
const CHIP_MS = 260; // cada dato que "entiende" Meld
const HOLD_MS = 2600; // pausa con el resultado completo antes del siguiente ejemplo

/** La tarjeta de "Dilo, y queda agendado" en movimiento: el micrófono late
 * mientras la frase aparece palabra por palabra (como en el dictado real),
 * después se van sumando los datos que entendió el parser y pasa al
 * siguiente ejemplo. Solo corre con la tarjeta en pantalla; con "reducir
 * movimiento" muestra el primer ejemplo completo, quieto. */
export function VoiceShowcase({ t }: { t: Dictionary['voice'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, () => reducedMotionQuery().matches, () => false);
  const [example, setExample] = useState(0);
  const [step, setStep] = useState(0); // palabras mostradas + datos mostrados

  const ex = t.examples[example];
  const words = ex.quote.split(' ');
  const chips = [...ex.chips, ...(ex.priority ? [ex.priority] : [])];
  const total = words.length + chips.length;

  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || reduced) return;
    const delay = step < words.length ? WORD_MS : step < total ? CHIP_MS : HOLD_MS;
    const id = setTimeout(() => {
      if (step < total) setStep(step + 1);
      else {
        setExample((e) => (e + 1) % t.examples.length);
        setStep(0);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [visible, reduced, step, total, words.length, t.examples.length]);

  const shownWords = reduced ? words.length : Math.min(step, words.length);
  const shownChips = reduced ? chips.length : Math.max(0, step - words.length);
  const listening = !reduced && shownWords < words.length;
  const Icon = TYPE_ICON[ex.type];
  const chip = 'flex animate-row-in items-center gap-1.5 rounded-full bg-surface-2 px-3 py-[7px] text-[13px] font-semibold sm:text-sm';

  return (
    <div ref={ref} className="flex w-full max-w-[440px] flex-col items-center gap-[18px] sm:gap-[26px]">
      <div className="relative flex size-[92px] items-center justify-center sm:size-[120px]">
        {listening && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-coral/25 [animation-duration:1.6s]" />
            <span className="absolute -inset-3 animate-ping rounded-full bg-coral/10 [animation-delay:0.4s] [animation-duration:1.6s]" />
          </>
        )}
        <div
          className={`relative flex size-full items-center justify-center rounded-full bg-[radial-gradient(circle,#FF6B82_0%,#FF4B66_45%,rgba(255,75,102,0.15)_72%,rgba(255,75,102,0)_100%)] transition-transform duration-500 ${
            listening ? 'scale-105' : 'scale-100'
          }`}
        >
          <Mic className="size-[30px] text-white sm:size-10" aria-hidden />
        </div>
      </div>

      {/* Barras de sonido: se mueven mientras "escucha". */}
      <div className="flex h-6 items-center gap-1" aria-hidden>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-coral/80 transition-[height] duration-300"
            style={
              listening
                ? { height: '100%', animation: `voice-bar 0.9s ease-in-out ${i * 0.11}s infinite alternate` }
                : { height: 4 }
            }
          />
        ))}
      </div>

      <p className="sr-only">“{ex.quote}”</p>
      <p aria-hidden className="min-h-[54px] text-center text-[19px] leading-[1.4] font-semibold sm:min-h-[68px] sm:text-2xl">
        “{words.slice(0, shownWords).join(' ')}
        {listening && <span className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[3px] animate-pulse bg-coral" />}”
      </p>

      <div className="flex min-h-[92px] w-full flex-col gap-2.5 rounded-[18px] border border-line bg-bg p-3.5 sm:min-h-[100px] sm:rounded-[20px] sm:p-[18px]">
        <span className="font-mono text-[11px] tracking-[0.08em] text-faint uppercase sm:text-xs">{t.understood}</span>
        <div className="flex flex-wrap gap-[7px] sm:gap-2">
          {chips.slice(0, shownChips).map((c, i) => (
            <span key={`${example}-${c}`} className={chip}>
              {i === 0 && <Icon size={14} className={TYPE_COLOR[ex.type]} aria-hidden />}
              {i === chips.length - 1 && ex.priority ? <span className="size-2 rounded-full bg-[#E5484D]" /> : null}
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Indicador del ejemplo actual */}
      <div className="flex gap-1.5" aria-hidden>
        {t.examples.map((e, i) => (
          <span key={e.quote} className={`h-1.5 rounded-sm transition-all duration-300 ${i === example ? 'w-[18px] bg-ink' : 'w-1.5 bg-[#4a4a50]'}`} />
        ))}
      </div>
    </div>
  );
}
