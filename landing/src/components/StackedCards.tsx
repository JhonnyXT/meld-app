'use client';

import { Children, useEffect, useRef, type ReactNode } from 'react';

const STEP = 16;
const SHRINK = 0.035;
const DIM = 0.14;

export function StackedCards({ children, top = 88 }: { children: ReactNode; top?: number }) {
  const items = Children.toArray(children);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const update = () => {
      const els = refs.current.filter((el): el is HTMLDivElement => el !== null);
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
