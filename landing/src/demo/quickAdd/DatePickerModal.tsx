'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fromDateKey, toDateKey } from '../model';
import type { DemoStrings } from '../strings';

interface Cell {
  dateKey: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

// Grilla lunes-primero, igual que `buildMonthGrid` de la app.
function buildMonthGrid(year: number, month: number, todayKey: string): Cell[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const start = new Date(year, month, 1 - lead);
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dow = (date.getDay() + 6) % 7;
    const dateKey = toDateKey(date);
    return { dateKey, day: date.getDate(), inMonth: date.getMonth() === month, isToday: dateKey === todayKey, isWeekend: dow === 5 || dow === 6 };
  });
}

/** Calendario de mes (réplica de `DatePickerModal`/`MonthCalendarPicker` de
 * la app): chip "Hoy" + grilla lunes-primero, con navegación de mes. */
export function DatePickerModal({
  s,
  selectedKey,
  todayKey,
  onCancel,
  onSelect,
}: {
  s: DemoStrings;
  selectedKey: string;
  todayKey: string;
  onCancel: () => void;
  onSelect: (key: string) => void;
}) {
  const initial = fromDateKey(selectedKey || todayKey);
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth(), todayKey), [cursor, todayKey]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 px-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.qa.selectDate}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-3xl border border-line bg-surface p-5"
        style={{ animation: 'modal-pop 220ms cubic-bezier(.34,1.4,.64,1) both' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[17px] font-bold">{s.qa.selectDate}</p>
          <button type="button" onClick={onCancel} aria-label={s.close} className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-dim">
            <X size={15} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSelect(todayKey)}
          aria-pressed={selectedKey === todayKey}
          className={`mb-4 rounded-full px-4 py-1.5 text-[13px] font-semibold ${selectedKey === todayKey ? 'bg-coral-btn text-white' : 'bg-surface-2 text-dim'}`}
        >
          {s.today}
        </button>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} aria-label={s.prevDay} className="cursor-pointer p-1 text-dim hover:text-ink">
            <ChevronLeft size={19} />
          </button>
          <span className="text-[15px] font-semibold">
            {s.months[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <button type="button" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} aria-label={s.nextDay} className="cursor-pointer p-1 text-dim hover:text-ink">
            <ChevronRight size={19} />
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7">
          {s.qa.weekdayHeader.map((d, i) => (
            <span key={i} className="py-1 text-center font-mono text-[11px] text-faint">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((cell) => {
            const selected = cell.dateKey === selectedKey;
            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => onSelect(cell.dateKey)}
                className="flex h-10 cursor-pointer items-center justify-center"
              >
                <span
                  className={`flex size-[34px] items-center justify-center rounded-full text-[15px] font-medium ${
                    selected
                      ? 'bg-coral-btn text-white'
                      : !cell.inMonth
                        ? 'text-faint/40'
                        : cell.isToday
                          ? 'border-[1.5px] border-coral text-coral'
                          : cell.isWeekend
                            ? 'text-coral'
                            : 'text-ink'
                  }`}
                >
                  {cell.day}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
