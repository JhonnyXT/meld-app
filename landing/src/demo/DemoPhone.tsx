'use client';

import {
  Bell,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  FileText,
  Image as ImageIcon,
  Inbox,
  ListFilter,
  Menu,
  Mic,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Settings,
  X,
  AudioLines,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { dayLong, dayTitle } from './dateFormat';
import { DemoRow } from './DemoRow';
import { clock12, dayProgress, fromDateKey, GROUP_ORDER, habitStreak, shiftKey, visibleFor, type DemoItem, type ItemType, type Language } from './model';
import { QuickAddSheet, type Prefill } from './QuickAddSheet';
import type { DemoStrings } from './strings';
import { UNDO_MS, type DemoApi } from './useDemo';
import { getSpeechRecognition, VoiceOverlay } from './VoiceOverlay';

const TYPE_ICON: Record<ItemType, LucideIcon> = { task: Check, event: Calendar, habit: Repeat, note: FileText, voiceMemo: AudioLines };
const NAV_ICONS: LucideIcon[] = [CalendarCheck, Inbox, CalendarDays, ImageIcon, Settings];
const SIM_PLAY_MS = 7000; // las notas de ejemplo (sin audio real) se "reproducen" aceleradas

const noopSubscribe = () => () => {};

type Sheet = { editing: DemoItem | null; prefill: Prefill | null } | null;


/** La pantalla Hoy de la app, funcionando en el navegador. */
export function DemoPhone({ s, lang, api }: { s: DemoStrings; lang: Language; api: DemoApi }) {
  const { state, dispatch } = api;
  const { items, todayKey, selectedKey, undo } = state;

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [grouped, setGrouped] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<ItemType>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ id: string; progress: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simProgress = useRef(0);

  // El dictado depende del navegador; en el servidor se asume que no hay.
  const voiceSupported = useSyncExternalStore(
    noopSubscribe,
    () => getSpeechRecognition() !== null,
    () => false,
  );

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  // ─── Reproducción de notas de voz ──────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (simRef.current) clearInterval(simRef.current);
    simRef.current = null;
    setPlaying(null);
  }, []);
  useEffect(() => stopPlayback, [stopPlayback]);

  const togglePlay = (item: DemoItem) => {
    if (playing?.id === item.id) return stopPlayback();
    stopPlayback();
    const total = item.durationSec ?? 1;
    if (item.audioUrl) {
      const a = new Audio(item.audioUrl);
      audioRef.current = a;
      a.ontimeupdate = () => setPlaying({ id: item.id, progress: Math.min(1, a.currentTime / total) });
      a.onended = stopPlayback;
      void a.play();
    } else {
      simProgress.current = 0;
      simRef.current = setInterval(() => {
        simProgress.current += 100 / SIM_PLAY_MS;
        if (simProgress.current >= 1) stopPlayback();
        else setPlaying({ id: item.id, progress: simProgress.current });
      }, 100);
    }
    setPlaying({ id: item.id, progress: 0 });
  };

  // ─── Derivados ─────────────────────────────────────────────────────────────
  const rows = visibleFor(items, selectedKey);
  const { done, total } = dayProgress(items, selectedKey);
  const q = query.trim().toLowerCase();
  const results = searchOpen && q.length >= 2 ? items.filter((i) => i.title.toLowerCase().includes(q)) : null;
  const isToday = selectedKey === todayKey;

  const openNew = (prefill: Prefill | null = null) => {
    setFabOpen(false);
    setSheet({ editing: null, prefill });
  };

  const renderRow = (item: DemoItem) => (
    <DemoRow
      key={item.id}
      item={item}
      s={s}
      streak={item.type === 'habit' ? habitStreak(item, todayKey) : 0}
      playing={playing?.id === item.id}
      progress={playing?.id === item.id ? playing.progress : 0}
      onToggle={() =>
        item.type === 'habit' ? dispatch({ type: 'toggleHabit', id: item.id, key: selectedKey }) : dispatch({ type: 'toggleTask', id: item.id })
      }
      onPlay={() => togglePlay(item)}
      onOpen={() => setSheet({ editing: item, prefill: null })}
      onDelete={() => {
        if (playing?.id === item.id) stopPlayback();
        dispatch({ type: 'remove', id: item.id });
      }}
    />
  );

  // Recordatorios próximos (⋯): desde ahora en adelante, en orden.
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const upcoming = remindersOpen
    ? items
        .filter((i) => i.time !== null && i.type !== 'habit' && !(i.type === 'task' && i.done) && (i.date > todayKey || (i.date === todayKey && (i.time ?? 0) >= nowMin)))
        .sort((a, b) => (a.date === b.date ? (a.time ?? 0) - (b.time ?? 0) : a.date < b.date ? -1 : 1))
    : [];

  const topCard = undo
    ? 'undo'
    : toast
      ? 'toast'
      : !isToday && !menuOpen && !fabOpen
        ? 'today'
        : null;

  return (
    <div role="region" aria-label={s.phoneLabel} className="relative h-full w-full overflow-hidden text-left">
      {/* Encabezado (TopAppBar) */}
      <div className="flex flex-col gap-3 px-4 pt-[70px]">
        <div className="flex items-start justify-between px-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-[34px] leading-[1.3] font-extrabold tracking-tight" suppressHydrationWarning>
              {dayTitle(s, selectedKey, todayKey)}
            </span>
            <span className="text-sm text-faint" suppressHydrationWarning>
              {dayLong(s, selectedKey)}
            </span>
          </div>
          <div className="flex gap-1 pt-1.5">
            {[
              {
                Icon: Search,
                label: s.search,
                active: searchOpen,
                onClick: () => {
                  setSearchOpen((o) => !o);
                  setQuery('');
                },
              },
              { Icon: ListFilter, label: s.group, active: grouped, onClick: () => setGrouped((g) => !g) },
              { Icon: Ellipsis, label: s.more, active: remindersOpen, onClick: () => setRemindersOpen(true) },
            ].map(({ Icon, label, active, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                aria-label={label}
                aria-pressed={active}
                className={`flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-surface-2 ${active ? 'text-coral' : 'text-ink'}`}
              >
                <Icon size={19} />
              </button>
            ))}
          </div>
        </div>
        {searchOpen && (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={s.searchPlaceholder}
            aria-label={s.search}
            className="h-11 animate-row-in rounded-2xl border border-line bg-surface px-3.5 text-base text-ink placeholder:text-faint focus:border-coral focus:outline-none"
          />
        )}
      </div>

      {/* Lista */}
      <div className="mt-3 flex h-[calc(100%-160px)] flex-col gap-2.5 overflow-y-auto px-4 pb-44 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {results ? (
          results.length === 0 ? (
            <p className="pt-6 text-center text-sm text-faint">{s.noResults}</p>
          ) : (
            results.map((item) => {
              const Icon = TYPE_ICON[item.type];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'setDay', key: item.type === 'habit' ? todayKey : item.date });
                    setSearchOpen(false);
                    setQuery('');
                    setSheet({ editing: item, prefill: null });
                  }}
                  className="flex h-[54px] animate-row-in cursor-pointer items-center gap-3 rounded-[14px] bg-surface px-3.5 text-left hover:bg-surface-2"
                >
                  <Icon size={16} className="shrink-0 text-dim" />
                  <span className="flex-1 truncate font-semibold">{item.title}</span>
                  <span className="text-xs text-faint">{item.type === 'habit' ? s.schedules[item.schedule ?? 'Every day'] : dayLong(s, item.date)}</span>
                </button>
              );
            })
          )
        ) : rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 pb-10 text-center">
            <div className="mb-2 flex size-16 animate-bounce items-center justify-center rounded-2xl bg-surface [animation-duration:2.4s]">
              <CalendarCheck size={28} className="text-coral" />
            </div>
            <span className="text-lg font-bold">{isToday ? s.emptyToday : s.emptyDay}</span>
            <span className="text-sm text-dim">{s.emptyHint}</span>
          </div>
        ) : grouped ? (
          GROUP_ORDER.flatMap((type) => {
            const group = rows.filter((r) => r.type === type);
            if (group.length === 0) return [];
            const isCollapsed = collapsed.has(type);
            return [
              <button
                key={`h-${type}`}
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() =>
                  setCollapsed((c) => {
                    const next = new Set(c);
                    if (next.has(type)) next.delete(type);
                    else next.add(type);
                    return next;
                  })
                }
                className="mt-1 flex cursor-pointer items-center gap-2 px-1 text-left text-xs font-bold tracking-wide text-dim uppercase"
              >
                {s.groups[type]}
                <span className="font-mono text-faint">{group.length}</span>
                <span className="h-px flex-1 border-t border-dashed border-line" />
                <ChevronDown size={14} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>,
              ...(isCollapsed ? [] : group.map(renderRow)),
            ];
          })
        ) : (
          rows.map(renderRow)
        )}
      </div>

      {/* Fondo oscuro del speed-dial del + */}
      {fabOpen && <div className="absolute inset-0 z-10 bg-black/55" onClick={() => setFabOpen(false)} />}

      {/* Barra flotante (FloatingBar + DayBar) */}
      <div className="absolute right-3.5 bottom-[26px] left-3.5 z-20 flex flex-col gap-2.5">
        {fabOpen && (
          <div className="flex flex-col items-end gap-2.5 pr-0.5">
            {voiceSupported && (
              <button
                type="button"
                onClick={() => {
                  setFabOpen(false);
                  setVoiceOpen(true);
                }}
                className="flex h-11 animate-row-in cursor-pointer items-center gap-2 rounded-full bg-coral-btn px-4 text-sm font-bold text-white shadow-lg"
              >
                <Mic size={16} />
                {s.byVoice}
              </button>
            )}
            <button
              type="button"
              onClick={() => openNew()}
              className="flex h-11 animate-row-in cursor-pointer items-center gap-2 rounded-full bg-[#3B82F6] px-4 text-sm font-bold text-white shadow-lg"
            >
              <FileText size={16} />
              {s.byText}
            </button>
          </div>
        )}

        {topCard && (
          <div className="relative flex h-[52px] animate-row-in items-center gap-3 overflow-hidden rounded-3xl bg-surface px-4 shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
            {topCard === 'undo' && undo ? (
              <>
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${undo.kind === 'deleted' ? 'bg-[#E5484D]/20 text-[#E5484D]' : 'bg-coral/20 text-coral'}`}>
                  {undo.kind === 'deleted' ? <X size={14} /> : <Check size={14} />}
                </span>
                <span className="flex-1 text-sm font-semibold">{undo.kind === 'task' ? s.undoTask : undo.kind === 'habit' ? s.undoHabit : s.undoDeleted}</span>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'undo' })}
                  className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[13px] font-bold hover:bg-line"
                >
                  <RotateCcw size={13} />
                  {s.undo}
                </button>
                <span key={undo.at} className="absolute right-0 bottom-0 left-0 h-[3px] origin-left bg-coral" style={{ animation: `undo-bar ${UNDO_MS}ms linear forwards` }} />
              </>
            ) : topCard === 'toast' ? (
              <span className="text-[13px] leading-snug text-dim">{toast}</span>
            ) : (
              <button type="button" onClick={() => dispatch({ type: 'setDay', key: todayKey })} className="flex w-full cursor-pointer items-center justify-center gap-2 text-sm font-bold text-coral">
                <RotateCcw size={14} />
                {s.backToToday}
              </button>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setMenuOpen((o) => !o);
              setFabOpen(false);
            }}
            aria-label={menuOpen ? s.closeMenu : s.menu}
            aria-expanded={menuOpen}
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-2 hover:bg-line"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          {menuOpen ? (
            <nav aria-label={s.menu} className="flex h-12 flex-1 animate-row-in items-center justify-between rounded-3xl bg-surface-2 px-1.5">
              {s.destinations.map((label, i) => {
                const Icon = NAV_ICONS[i];
                return (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    aria-current={i === 0 ? 'page' : undefined}
                    onClick={() => {
                      setMenuOpen(false);
                      if (i === 0) dispatch({ type: 'setDay', key: todayKey });
                      else setToast(`${label}: ${s.inAppOnly}`);
                    }}
                    className={`flex size-10 cursor-pointer items-center justify-center rounded-full ${i === 0 ? 'bg-coral-btn text-white' : 'text-dim hover:text-ink'}`}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </nav>
          ) : (
            <>
              <div className="flex h-12 flex-1 items-center justify-between rounded-3xl bg-surface-2 px-1">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'setDay', key: shiftKey(selectedKey, -1) })}
                  aria-label={s.prevDay}
                  className="flex h-11 w-9 cursor-pointer items-center justify-center text-faint hover:text-ink"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'setDay', key: todayKey })}
                  aria-label={s.backToToday}
                  className="flex cursor-pointer flex-col items-center"
                >
                  <span className="text-sm font-bold" suppressHydrationWarning>
                    {`${s.weekdays[fromDateKey(selectedKey).getDay()]} ${fromDateKey(selectedKey).getDate()}`}
                  </span>
                  <span className="text-[11px] text-faint">{s.doneOf.replace('{done}', String(done)).replace('{total}', String(total))}</span>
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'setDay', key: shiftKey(selectedKey, 1) })}
                  aria-label={s.nextDay}
                  className="flex h-11 w-9 cursor-pointer items-center justify-center text-faint hover:text-ink"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => (voiceSupported ? setFabOpen((o) => !o) : openNew())}
                aria-label={fabOpen ? s.close : s.add}
                aria-expanded={voiceSupported ? fabOpen : undefined}
                className="flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-coral transition-transform hover:scale-105 active:scale-95"
              >
                <Plus size={24} strokeWidth={2.5} className={`text-white transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Próximos recordatorios (⋯) */}
      {remindersOpen && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/50" onClick={() => setRemindersOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={s.remindersTitle}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[70%] animate-row-in flex-col gap-3 rounded-t-[28px] border-t border-line bg-surface px-4 pt-3 pb-8"
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-[#4a4a50]" />
            <div className="flex items-center justify-between">
              <span className="text-xl font-extrabold">{s.remindersTitle}</span>
              <button type="button" onClick={() => setRemindersOpen(false)} aria-label={s.close} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-dim hover:text-ink">
                <X size={17} />
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto">
              {upcoming.length === 0 && <p className="py-6 text-center text-sm text-faint">{s.remindersEmpty}</p>}
              {upcoming.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-2xl bg-bg px-3.5 py-3">
                  <Bell size={16} className="shrink-0 text-coral" />
                  <span className="flex-1 truncate text-sm font-semibold">{i.title}</span>
                  <span className="text-xs text-dim">
                    {dayTitle(s, i.date, todayKey)} · {clock12(i.time ?? 0).label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {voiceOpen && (
        <VoiceOverlay
          s={s}
          lang={lang}
          onClose={() => setVoiceOpen(false)}
          onResult={(prefill) => {
            setVoiceOpen(false);
            openNew(prefill);
          }}
        />
      )}

      {sheet && (
        <QuickAddSheet
          s={s}
          lang={lang}
          todayKey={todayKey}
          defaultDate={selectedKey}
          editing={sheet.editing}
          prefill={sheet.prefill}
          onClose={() => setSheet(null)}
          onSave={(item) => {
            setSheet(null);
            dispatch({ type: 'save', item });
            // Si se agendó en otro día, ir a ese día para verlo (los hábitos recurren desde hoy).
            if (item.type !== 'habit' && item.date !== selectedKey) dispatch({ type: 'setDay', key: item.date });
          }}
        />
      )}
    </div>
  );
}
