'use client';

import { useEffect, useRef } from 'react';

const ITEM_H = 36;
const VISIBLE = 5;
export const WHEEL_HEIGHT = ITEM_H * VISIBLE;
const PAD = (ITEM_H * (VISIBLE - 1)) / 2;

/** Columna de rueda con scroll-snap (equivalente web de `WheelColumn` de la
 * app, que usa un `FlatList` con paginación por ítem). Al soltar el dedo/
 * scroll, el valor centrado se confirma con `onSelect`. */
export function WheelColumn<T extends string | number>({
  values,
  selectedValue,
  onSelect,
  format,
  accent,
}: {
  values: T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  format?: (value: T) => string;
  accent?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settled = useRef(Math.max(0, values.indexOf(selectedValue)));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Centrar en el valor inicial al montar, sin animación.
  useEffect(() => {
    ref.current?.scrollTo({ top: settled.current * ITEM_H });
  }, []);

  const settle = (index: number) => {
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    ref.current?.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
    if (clamped !== settled.current) {
      settled.current = clamped;
      onSelect(values[clamped]);
    }
  };

  const onScroll = () => {
    if (timer.current) clearTimeout(timer.current);
    // Espera a que el scroll se detenga (no hay evento "scrollend" fiable en
    // todos los navegadores) antes de confirmar el valor centrado.
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (el) settle(Math.round(el.scrollTop / ITEM_H));
    }, 110);
  };

  return (
    <div className="relative" style={{ height: WHEEL_HEIGHT, width: 56 }}>
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingBlock: PAD, WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 30%, #000 70%, transparent 100%)' }}
      >
        {values.map((v, i) => (
          <button
            key={String(v)}
            type="button"
            tabIndex={-1}
            onClick={() => settle(i)}
            className="flex w-full snap-center items-center justify-center"
            style={{ height: ITEM_H }}
          >
            <span className={`font-mono text-lg font-bold ${accent ? 'text-coral' : 'text-ink'}`}>
              {format ? format(v) : v}
            </span>
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-xl bg-surface-2/70" />
    </div>
  );
}
