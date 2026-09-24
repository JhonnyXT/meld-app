'use client';

import { Check, ChevronLeft, ChevronRight, Menu, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWaitlistJoined } from './WaitlistForm';

type Section = { id: string; label: string };
type Labels = { openMenu: string; closeMenu: string; prev: string; next: string; join: string; joined: string };

/** Barra flotante fija abajo, calcada de la DayBar de la app: ☰ abre la
 * lista de secciones, la cápsula del centro dice en qué sección estás (‹ ›
 * para moverte) y el botón coral lleva al formulario de la lista de espera. */
export function DockBar({ sections, labels }: { sections: Section[]; labels: Labels }) {
  const [current, setCurrent] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const joined = useWaitlistJoined();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = sections.findIndex((s) => s.id === entry.target.id);
          if (i >= 0) setCurrent(i);
        }
      },
      // Cuenta como "sección actual" la que cruza la franja media de la pantalla.
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const goTo = (i: number) => {
    const target = sections[Math.max(0, Math.min(sections.length - 1, i))];
    document.getElementById(target.id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto relative">
        {menuOpen && (
          <nav
            id="dock-menu"
            aria-label={labels.openMenu}
            className="absolute bottom-[calc(100%+10px)] left-0 w-56 rounded-3xl border border-line bg-surface/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur"
          >
            <ul className="flex flex-col">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === current ? 'true' : undefined}
                    className={`w-full cursor-pointer rounded-2xl px-4 py-2.5 text-left text-[15px] font-semibold ${
                      i === current ? 'bg-surface-2 text-ink' : 'text-dim hover:text-ink'
                    }`}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur sm:gap-2">
          <button
            type="button"
            aria-label={menuOpen ? labels.closeMenu : labels.openMenu}
            aria-expanded={menuOpen}
            aria-controls="dock-menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex size-[46px] cursor-pointer items-center justify-center rounded-full hover:bg-surface-2 sm:size-12"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex h-[46px] w-[150px] items-center justify-between rounded-full bg-surface-2 px-1 sm:h-12 sm:w-60 sm:px-1.5">
            <button
              type="button"
              aria-label={labels.prev}
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="flex h-11 w-[30px] cursor-pointer items-center justify-center text-faint hover:text-ink disabled:cursor-default disabled:opacity-40 sm:w-9"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-col items-center" aria-live="polite">
              <span className="text-[13px] font-bold sm:text-sm">Meld</span>
              <span className="text-[10px] text-faint sm:text-[11px]">{sections[current].label}</span>
            </div>
            <button
              type="button"
              aria-label={labels.next}
              onClick={() => goTo(current + 1)}
              disabled={current === sections.length - 1}
              className="flex h-11 w-[30px] cursor-pointer items-center justify-center text-faint hover:text-ink disabled:cursor-default disabled:opacity-40 sm:w-9"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <a
            href="#unirme"
            className={`flex h-[46px] items-center gap-1.5 rounded-full px-4 text-sm font-bold sm:h-12 sm:gap-2 sm:px-5 sm:text-[15px] ${
              joined ? 'bg-surface-2 text-ink hover:bg-line' : 'bg-coral-btn text-white hover:bg-coral-btn-hover'
            }`}
          >
            {joined ? <Check size={16} strokeWidth={2.5} className="text-coral" aria-hidden /> : <Plus size={16} strokeWidth={2.5} aria-hidden />}
            {joined ? labels.joined : labels.join}
          </a>
        </div>
      </div>
    </div>
  );
}
