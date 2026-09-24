'use client';

import { useState } from 'react';
import type { DemoStrings } from '../strings';
import { WheelColumn } from './WheelColumn';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const two = (n: number) => String(n).padStart(2, '0');

/** Wheel-picker de hora (réplica de `WheelTimePicker`/`TimePickerModal` de la
 * app): horas 1-12 + minutos 0-59 + AM/PM, con "Cualquier hora" opcional
 * para campos de recordatorio. `minutes` = minutos desde medianoche. */
export function TimePickerModal({
  s,
  minutes,
  allowAnyTime,
  onCancel,
  onConfirm,
  onSelectAnyTime,
}: {
  s: DemoStrings;
  minutes: number;
  allowAnyTime?: boolean;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
  onSelectAnyTime?: () => void;
}) {
  const initialH24 = Math.floor(minutes / 60);
  const [hour12, setHour12] = useState(initialH24 % 12 === 0 ? 12 : initialH24 % 12);
  const [minute, setMinute] = useState(minutes % 60);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initialH24 >= 12 ? 'PM' : 'AM');

  const confirm = () => {
    const h24 = period === 'AM' ? hour12 % 12 : (hour12 % 12) + 12;
    onConfirm(h24 * 60 + minute);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 px-7" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.qa.selectTime}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-3xl border border-line bg-surface px-5 pt-5 pb-4"
        style={{ animation: 'modal-pop 220ms cubic-bezier(.34,1.4,.64,1) both' }}
      >
        <p className="mb-3 text-center text-[17px] font-bold">{s.qa.selectTime}</p>
        <div className="mb-4 flex items-center justify-center gap-2">
          <WheelColumn values={HOURS} selectedValue={hour12} onSelect={setHour12} format={two} accent />
          <span className="text-xl font-bold text-dim">:</span>
          <WheelColumn values={MINUTES} selectedValue={minute} onSelect={setMinute} format={two} />
          <div className="ml-2 flex flex-col gap-1.5">
            {(['AM', 'PM'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPeriod(opt)}
                aria-pressed={period === opt}
                className={`cursor-pointer rounded-[10px] px-3 py-1.5 text-[13px] font-semibold ${
                  period === opt ? 'bg-coral-btn text-white' : 'bg-surface-2 text-dim'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        {allowAnyTime && onSelectAnyTime && (
          <button
            type="button"
            onClick={onSelectAnyTime}
            className="mb-2.5 w-full cursor-pointer rounded-2xl border border-line py-2.5 text-sm font-semibold text-dim hover:text-ink"
          >
            {s.qa.anyTime}
          </button>
        )}
        <div className="flex gap-2.5">
          <button type="button" onClick={onCancel} className="flex-1 cursor-pointer rounded-2xl bg-surface-2 py-3 text-[15px] font-semibold hover:bg-line">
            {s.cancel}
          </button>
          <button type="button" onClick={confirm} className="flex-1 cursor-pointer rounded-2xl bg-coral-btn py-3 text-[15px] font-semibold text-white hover:bg-coral-btn-hover">
            {s.qa.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
