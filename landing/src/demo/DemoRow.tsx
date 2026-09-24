'use client';

import { AudioLines, Calendar, Check, FileText, Flag, Flame, Footprints, Pause, Play, Repeat, Trash2 } from 'lucide-react';
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { CATEGORY_COLOR, clock12, PRIORITY_COLOR, type DemoItem } from './model';
import type { DemoStrings } from './strings';

const OPEN = 76; // ancho del botón de borrar que revela el swipe

function TimeCol({ time }: { time: number | null }) {
  if (time === null) {
    return (
      <div className="flex w-[46px] shrink-0 justify-center">
        <div className="h-[3px] w-4 rounded-sm bg-faint" />
      </div>
    );
  }
  const c = clock12(time);
  return (
    <div className="flex w-[46px] shrink-0 items-start justify-center gap-px font-mono font-bold">
      <span className="text-[22px] leading-none">{c.h}</span>
      <span className="flex flex-col text-[9px] leading-[1.1] text-dim">
        <span>{c.m}</span>
        <span>{c.ap}</span>
      </span>
    </div>
  );
}

export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const ICON = { event: Calendar, note: FileText, voiceMemo: AudioLines } as const;

/** Fila de la pantalla Hoy (réplica de `DayItemRow` + `SwipeToDeleteCard`):
 * el cuadro de tarea/hábito completa, tocar la fila abre el detalle y
 * deslizar a la izquierda revela el botón de borrar. */
export function DemoRow({
  item,
  s,
  streak,
  playing,
  progress,
  onToggle,
  onPlay,
  onOpen,
  onDelete,
}: {
  item: DemoItem;
  s: DemoStrings;
  streak: number;
  playing: boolean;
  progress: number;
  onToggle: () => void;
  onPlay: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; dx: number } | null>(null);
  const moved = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, y: e.clientY, dx };
    moved.current = false;
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const st = start.current;
    if (!st) return;
    const mx = e.clientX - st.x;
    const my = e.clientY - st.y;
    if (!moved.current && Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my)) {
      moved.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (moved.current) setDx(Math.max(-OPEN - 12, Math.min(0, st.dx + mx)));
  };
  const onPointerUp = () => {
    if (moved.current) setDx((d) => (d < -OPEN / 2 ? -OPEN : 0));
    setDragging(false);
    start.current = null;
  };
  const onClick = () => {
    if (moved.current) {
      moved.current = false;
      return;
    }
    if (dx !== 0) setDx(0);
    else onOpen();
  };

  const checkable = item.type === 'task' || item.type === 'habit';
  const Icon = item.type === 'task' ? Check : item.type === 'habit' ? Repeat : ICON[item.type];
  const badges: ReactNode[] = [];
  if (item.priority === 'medium' || item.priority === 'high') {
    badges.push(<Flag key="p" size={13} style={{ color: PRIORITY_COLOR[item.priority] }} fill="currentColor" aria-label={s.priorities[item.priority]} />);
  }
  if (item.type === 'habit' && streak >= 2) {
    badges.push(
      <span key="s" className="flex items-center gap-0.5 text-xs font-bold text-streak">
        <Flame size={12} />
        {streak}
      </span>,
    );
  }
  if (item.category && item.type !== 'voiceMemo') {
    badges.push(
      <span key="c" className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-dim">
        <span className="size-[7px] rounded-full" style={{ background: CATEGORY_COLOR[item.category] }} />
        {s.categories[item.category]}
      </span>,
    );
  }

  const secs = item.durationSec ?? 0;
  const elapsed = Math.round(progress * secs);

  return (
    <div className="flex w-full animate-row-in items-center gap-2">
      <TimeCol time={item.time} />
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-[14px]">
        <button
          type="button"
          onClick={onDelete}
          tabIndex={dx === -OPEN ? 0 : -1}
          aria-label={`${s.delete}: ${item.title}`}
          className="absolute inset-y-0 right-0 flex w-[76px] cursor-pointer items-center justify-center bg-[#E5484D] text-white"
          style={{ opacity: Math.min(1, -dx / 30) }}
        >
          <Trash2 size={18} />
        </button>
        <div
          role="button"
          tabIndex={0}
          aria-label={`${s.edit}: ${item.title}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onOpen();
            if (e.key === 'Delete' || e.key === 'Backspace') onDelete();
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={onClick}
          className={`relative flex h-[54px] cursor-pointer touch-pan-y items-center gap-3 bg-surface px-3.5 select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-coral ${
            dragging ? '' : 'transition-transform duration-200'
          }`}
          style={{ transform: `translateX(${dx}px)` }}
        >
          {checkable ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              aria-label={`${s.markDone}: ${item.title}`}
              className="-m-2 shrink-0 cursor-pointer rounded-lg p-2 active:scale-90"
            >
              <span className="flex size-[26px] items-center justify-center rounded-[7px] border-[1.5px] border-[#4a4a50] transition-colors hover:border-coral">
                <Icon size={14} className="text-faint" aria-hidden />
              </span>
            </button>
          ) : (
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] border-[#4a4a50]">
              <Icon size={14} className="text-faint" aria-hidden />
            </span>
          )}
          {item.health && <Footprints size={16} className="shrink-0 text-dim" aria-hidden />}
          <span className="min-w-0 flex-1 truncate text-left text-base font-semibold">{item.title}</span>
          {item.type === 'voiceMemo' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              aria-label={`${playing ? s.pause : s.play}: ${item.title}`}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-coral px-2 py-1 font-mono text-[11px] font-bold text-white"
            >
              {playing ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
              {mmss(playing ? elapsed : secs)}
            </button>
          ) : (
            badges.slice(0, 2)
          )}
          {item.type === 'voiceMemo' && (playing || progress > 0) && (
            <span className="absolute inset-x-3.5 bottom-1.5 h-[3px] overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-coral" style={{ width: `${progress * 100}%` }} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
