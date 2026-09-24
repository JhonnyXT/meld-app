'use client';

import { Children, useEffect, useRef, type ReactNode } from 'react';

const STEP = 16; // cuánto asoma el borde de cada tarjeta ya apilada
const SHRINK = 0.035; // cuánto se achica por cada tarjeta que tiene encima
const DIM = 0.14; // cuánto se oscurece por cada tarjeta que tiene encima

/** Apila tarjetas al hacer scroll, como archivos ordenándose en una carpeta:
 * cada una queda fija (`sticky`) un poco más abajo que la anterior, la
 * siguiente se desliza encima y las de atrás se achican y oscurecen según
 * cuántas tienen ya encima. Sin JS (o con "reducir movimiento") queda el
 * apilado con `sticky` solo, sin el achicado. */
export function StackedCards({ children, top = 88 }: { children: ReactNode; top?: number }) {
  const items = Children.toArray(children);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Se recalcula directo en cada evento de scroll (sin requestAnimationFrame):
    // son pocas tarjetas y así nunca queda desfasado si el navegador demora
    // los cuadros de animación.
    const update = () => {
      const els = refs.current.filter((el): el is HTMLDivElement => el !== null);
      // Cuánto está "encima de la pila" cada tarjeta: 0 = todavía abajo,
      // 1 = ya llegó a su lugar fijo.
      const landed = els.map((el, i) => {
        const r = el.getBoundingClientRect();
        const stickyTop = top + i * STEP;
        return Math.min(1, Math.max(0, 1 - (r.top - stickyTop) / r.height));
      });
      els.forEach((el, i) => {
        const depth = landed.slice(i + 1).reduce((sum, v) => sum + v, 0);
        const inner = el.firstElementChild as HTMLElement | null;
        if (!inner) return;
        inner.style.transform = `scale(${1 - SHRINK * depth})`;
        inner.style.filter = depth > 0 ? `brightness(${Math.max(0.45, 1 - DIM * depth)})` : '';
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [top, items.length]);

  return (
    <div className="flex w-full flex-col items-center gap-3.5 sm:gap-[18px]">
      {items.map((child, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="sticky flex w-full justify-center"
          style={{ top: top + i * STEP }}
        >
          <div className="flex w-full origin-top justify-center will-change-transform">{child}</div>
        </div>
      ))}
    </div>
  );
}
