'use client';

import { useState } from 'react';
import type { DemoStrings } from '../strings';
import { WheelColumn } from './WheelColumn';

const HOURS = [0, 1, 2, 3, 4];
const MINUTES = [0, 15, 30, 45];
const two = (n: number) => String(n).padStart(2, '0');
const nearestStep = (m: number) => MINUTES.reduce((c, v) => (Math.abs(v - m) < Math.abs(c - m) ? v : c));

/** Wheel-picker de DURACIÓN (0-4 h + minutos de 15 en 15), sin AM/PM porque
 * es un lapso, no una hora del día — réplica de `WheelDurationPicker`. */
export function DurationPickerModal({
  s,
  minutes,
  onCancel,
  onConfirm,
}: {
  s: DemoStrings;
  minutes: number;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
}) {
  const [hours, setHours] = useState(Math.min(4, Math.floor(minutes / 60)));
  const [mins, setMins] = useState(nearestStep(minutes % 60));

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 px-7" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.qa.selectDuration}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-3xl border border-line bg-surface px-5 pt-5 pb-4"
        style={{ animation: 'modal-pop 220ms cubic-bezier(.34,1.4,.64,1) both' }}
      >
        <p className="mb-3 text-center text-[17px] font-bold">{s.qa.selectDuration}</p>
        <div className="mb-4 flex items-center justify-center gap-2">
          <WheelColumn values={HOURS} selectedValue={hours} onSelect={setHours} format={two} accent />
          <span className="text-xl font-bold text-dim">:</span>
          <WheelColumn values={MINUTES} selectedValue={mins} onSelect={setMins} format={two} />
        </div>
        <div className="flex gap-2.5">
          <button type="button" onClick={onCancel} className="flex-1 cursor-pointer rounded-2xl bg-surface-2 py-3 text-[15px] font-semibold hover:bg-line">
            {s.cancel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(hours * 60 + mins || 15)}
            className="flex-1 cursor-pointer rounded-2xl bg-coral-btn py-3 text-[15px] font-semibold text-white hover:bg-coral-btn-hover"
          >
            {s.qa.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
