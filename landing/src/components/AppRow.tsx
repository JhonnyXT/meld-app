import type { ReactNode } from 'react';
import { AudioLines, Bell, Calendar, Check, FileText, Image as ImageIcon, Repeat, type LucideIcon } from 'lucide-react';

export type ItemType = 'task' | 'event' | 'habit' | 'note' | 'voice' | 'moment';
export type RowTime = { kind: 'bell' } | { kind: 'dash' } | { kind: 'time'; h: string; m: string; ap: string };

const TYPE_ICON: Record<ItemType, LucideIcon> = {
  task: Check,
  event: Calendar,
  habit: Repeat,
  note: FileText,
  voice: AudioLines,
  moment: ImageIcon,
};

function TimeColumn({ time }: { time: RowTime }) {
  if (time.kind === 'bell') {
    return (
      <div className="flex w-[46px] shrink-0 justify-center">
        <Bell size={16} className="text-faint" aria-hidden />
      </div>
    );
  }
  if (time.kind === 'dash') {
    return (
      <div className="flex w-[46px] shrink-0 justify-center">
        <div className="h-[3px] w-4 rounded-sm bg-faint" />
      </div>
    );
  }
  return (
    <div className="flex w-[46px] shrink-0 items-start justify-center gap-px font-mono font-bold">
      <span className="text-[22px] leading-none">{time.h}</span>
      <span className="flex flex-col text-[9px] leading-[1.1] text-dim">
        <span>{time.m}</span>
        <span>{time.ap}</span>
      </span>
    </div>
  );
}

/** Réplica de una fila de la pantalla Hoy de la app (`DayItemRow`): columna de
 * hora + tarjeta con el cuadro del tipo, título y un detalle a la derecha.
 * Con `onToggle` el cuadro es un botón (marcar hecho); con `onPress` la
 * tarjeta entera lo es (p. ej. reproducir una nota de voz); `progress`
 * (0–1) dibuja una barra de reproducción al pie de la tarjeta. */
export function AppRow({
  time,
  type,
  title,
  done = false,
  lead,
  trailing,
  onToggle,
  toggleLabel,
  onPress,
  pressLabel,
  progress,
  className = '',
}: {
  time: RowTime;
  type: ItemType;
  title: string;
  done?: boolean;
  lead?: ReactNode;
  trailing?: ReactNode;
  onToggle?: () => void;
  toggleLabel?: string;
  onPress?: () => void;
  pressLabel?: string;
  progress?: number;
  className?: string;
}) {
  const Icon = TYPE_ICON[type];
  const box = (
    <span
      className={`flex size-[26px] shrink-0 items-center justify-center rounded-[7px] transition-colors duration-200 ${
        done ? 'bg-coral-btn' : 'border-[1.5px] border-[#4a4a50]'
      }`}
    >
      {done ? (
        <Check size={15} strokeWidth={2.5} className="text-white" aria-hidden />
      ) : (
        <Icon size={14} className="text-faint" aria-hidden />
      )}
    </span>
  );
  const body = (
    <>
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={done}
          aria-label={toggleLabel}
          className="-m-2 cursor-pointer rounded-lg p-2 transition-transform active:scale-90 focus-visible:outline-2 focus-visible:outline-coral"
        >
          {box}
        </button>
      ) : (
        box
      )}
      {lead}
      <span className={`min-w-0 flex-1 truncate text-base font-semibold transition-colors ${done ? 'text-faint line-through' : ''}`}>
        {title}
      </span>
      {trailing}
      {progress !== undefined && (
        <span className="absolute inset-x-3.5 bottom-1.5 h-[3px] overflow-hidden rounded-full bg-line">
          <span className="block h-full rounded-full bg-coral" style={{ width: `${progress * 100}%` }} />
        </span>
      )}
    </>
  );
  const card = 'relative flex h-[54px] min-w-0 flex-1 items-center gap-3 rounded-[14px] bg-surface px-3.5 text-left';
  return (
    <div className={`flex w-full items-center gap-2 ${className}`}>
      <TimeColumn time={time} />
      {onPress ? (
        <button
          type="button"
          onClick={onPress}
          aria-label={pressLabel}
          className={`${card} cursor-pointer transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-coral`}
        >
          {body}
        </button>
      ) : (
        <div className={card}>{body}</div>
      )}
    </div>
  );
}

export function CategoryDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-dim">
      <span className="size-[7px] rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function MonoTag({ children }: { children: ReactNode }) {
  return <span className="shrink-0 font-mono text-xs text-faint">{children}</span>;
}
