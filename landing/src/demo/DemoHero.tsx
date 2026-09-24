'use client';

import { Check, Flame, Repeat } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { DemoPhone } from './DemoPhone';
import { clock12, dayProgress, habitStreak, isHabitScheduledOn, visibleFor } from './model';
import { demoStrings } from './strings';
import { useDemo } from './useDemo';

const widgetBox = 'flex flex-col gap-3.5 rounded-[28px] bg-surface px-[22px] py-5 text-left shadow-[0_30px_60px_rgba(0,0,0,0.6)]';

/** Portada interactiva: la pantalla Hoy funcionando dentro del teléfono y, en
 * pantallas anchas, los widgets Hoy y Hábitos leyendo el mismo estado (como
 * en la app, se puede marcar desde el widget). Nada se guarda: al recargar
 * vuelve a los datos de ejemplo. */
export function DemoHero({ locale, widgetsNote }: { locale: Locale; widgetsNote: string }) {
  const s = demoStrings[locale];
  const api = useDemo(s.seed);
  const { items, todayKey } = api.state;

  const pending = visibleFor(items, todayKey).slice(0, 4);
  const today = dayProgress(items, todayKey);
  const habits = items.filter((i) => i.type === 'habit' && isHabitScheduledOn(i, todayKey));
  const habitsDone = habits.filter((h) => (h.completed ?? []).includes(todayKey)).length;

  return (
    <div className="relative flex w-full max-w-[1100px] flex-col items-center gap-5 lg:h-[860px]">
      <div className="absolute top-[150px] left-2.5 hidden lg:block">
        <span className="absolute -top-10 left-10 -rotate-[4deg] font-hand text-2xl text-dim">{widgetsNote}</span>
        <div className={`${widgetBox} w-[330px]`}>
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-extrabold">{s.widgets.today}</span>
            <span className="rounded-full bg-[#2a2a2c] px-2.5 py-0.5 font-mono text-xs font-bold">
              {today.done}/{today.total}
            </span>
          </div>
          {pending.length === 0 && <span className="text-sm text-dim">{s.widgets.allDone}</span>}
          {pending.map((item) => (
            <div key={item.id} className="flex animate-row-in items-center gap-2.5">
              {item.type === 'task' || item.type === 'habit' ? (
                <button
                  type="button"
                  onClick={() =>
                    api.dispatch(item.type === 'habit' ? { type: 'toggleHabit', id: item.id, key: todayKey } : { type: 'toggleTask', id: item.id })
                  }
                  aria-label={`${s.markDone}: ${item.title}`}
                  className="size-[18px] shrink-0 cursor-pointer rounded-[5px] border-[1.5px] border-[#4a4a50] transition-colors hover:border-coral"
                />
              ) : (
                <span className="size-[18px] shrink-0 rounded-[5px] border-[1.5px] border-[#3a3a3f]" />
              )}
              <span className="w-[58px] shrink-0 font-mono text-[11px] text-faint">{item.time === null ? '—' : clock12(item.time).label}</span>
              <span className="truncate text-sm font-semibold">{item.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-[210px] right-7 hidden lg:block">
        <div className={`${widgetBox} w-[300px]`}>
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-extrabold">{s.widgets.habits}</span>
            <span className="rounded-full bg-[#2a2a2c] px-2.5 py-0.5 font-mono text-xs font-bold">
              {habitsDone}/{habits.length}
            </span>
          </div>
          {habits.length === 0 && <span className="text-sm text-dim">{s.widgets.noHabits}</span>}
          {habits.map((h) => {
            const done = (h.completed ?? []).includes(todayKey);
            return (
              <div key={h.id} className="flex animate-row-in items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => api.dispatch({ type: 'toggleHabit', id: h.id, key: todayKey })}
                  aria-pressed={done}
                  aria-label={`${s.markDone}: ${h.title}`}
                  className={`flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                    done ? 'bg-coral-btn' : 'bg-[#2a2a2c] hover:bg-line'
                  }`}
                >
                  {done ? <Check size={14} strokeWidth={2.5} className="text-white" /> : <Repeat size={13} className="text-dim" />}
                </button>
                <span className={`flex-1 truncate text-sm font-semibold ${done ? 'text-faint line-through' : ''}`}>{h.title}</span>
                {habitStreak(h, todayKey) > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-streak">
                    <Flame size={12} />
                    {habitStreak(h, todayKey)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Teléfono: 380×780, escalado al 80% en móvil. */}
      <div className="h-[624px] w-[304px] sm:h-[780px] sm:w-[380px]">
        <div className="relative h-[780px] w-[380px] origin-top-left scale-[0.8] overflow-hidden rounded-[58px] border-8 border-[#2a2a2e] bg-[#0a0a0b] shadow-[0_40px_90px_rgba(0,0,0,0.7),inset_0_0_0_2px_#3a3a3f] sm:scale-100">
          <div className="pointer-events-none absolute top-3.5 left-[122px] z-40 h-[34px] w-[120px] rounded-[20px] bg-black" />
          <DemoPhone s={s} lang={locale} api={api} />
          <div className="pointer-events-none absolute bottom-2 left-[125px] z-40 h-1 w-[114px] rounded-sm bg-[#5a5a60]" />
        </div>
      </div>

      <p className="flex items-center gap-2 font-hand text-[22px] text-dim lg:absolute lg:bottom-[70px] lg:left-[40px] lg:w-[270px] lg:-rotate-3">
        {s.hint}
        <svg width="60" height="30" viewBox="0 0 70 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="hidden shrink-0 -scale-x-100 text-faint lg:block" aria-hidden>
          <path d="M64 4 C 50 26, 30 30, 6 28" />
          <polyline points="14 22 6 28 14 33" />
        </svg>
      </p>
    </div>
  );
}
