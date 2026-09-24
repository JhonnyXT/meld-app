'use client';

import { Check, Heart, Minus, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { findHealthMetricOption, HEALTH_METRIC_OPTIONS, type HealthMetricGroup } from '../healthMetrics';
import { FieldRow } from './FieldParts';
import type { DemoStrings } from '../strings';

const GROUPS: HealthMetricGroup[] = ['activity', 'rings', 'workouts'];

/** Hoja modal (no un picker compacto — es una lista larga, ver
 * "Auto-registro real" en CLAUDE.md): "Ninguna" + 3 grupos de métricas. Tocar
 * una de Actividad muestra un stepper +/- inline en esa fila. */
function AutoTrackModal({
  s,
  metricId,
  target,
  onChange,
  onClose,
}: {
  s: DemoStrings;
  metricId: string | null;
  target: number | null;
  onChange: (id: string | null, target: number | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.qa.health.title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85%] animate-row-in flex-col rounded-t-[28px] border-t border-line bg-surface"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#4a4a50]" />
        <div className="flex shrink-0 items-center justify-between px-4 pt-2 pb-1">
          <span className="text-xl font-extrabold">{s.qa.health.title}</span>
          <button type="button" onClick={onClose} aria-label={s.close} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-dim hover:text-ink">
            <X size={17} />
          </button>
        </div>
        <p className="shrink-0 px-4 pb-3 text-[13px] leading-relaxed text-dim">{s.qa.health.proNote}</p>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="flex w-full cursor-pointer items-center justify-between border-b border-line py-3.5 text-left"
          >
            <span className="text-[15px] font-medium">{s.qa.none}</span>
            {metricId === null && <Check size={18} className="text-coral" />}
          </button>
          {GROUPS.map((group) => {
            const opts = HEALTH_METRIC_OPTIONS.filter((o) => o.group === group);
            return (
              <div key={group} className="pt-4">
                <span className="mb-1 block font-mono text-[11px] font-bold tracking-wide text-faint">{s.qa.health.groups[group]}</span>
                {opts.map((opt, i) => {
                  const Icon = opt.icon;
                  const selected = metricId === opt.id;
                  const value = target ?? opt.defaultTarget ?? 0;
                  return (
                    <div key={opt.id} className={i < opts.length - 1 ? 'border-b border-line' : ''}>
                      <button
                        type="button"
                        onClick={() => onChange(opt.id, selected ? target : (opt.defaultTarget ?? null))}
                        className="flex w-full cursor-pointer items-center gap-3 py-3.5 text-left"
                      >
                        <Icon size={18} className="shrink-0 text-dim" />
                        <span className="flex-1 truncate text-[15px]">{s.qa.health.metrics[opt.key]}</span>
                        {selected && <Check size={18} className="shrink-0 text-coral" />}
                      </button>
                      {selected && opt.defaultTarget !== undefined && (
                        <div className="flex items-center justify-between pb-3.5 pl-9">
                          <button
                            type="button"
                            onClick={() => onChange(opt.id, Math.max(opt.step ?? 1, value - (opt.step ?? 1)))}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-surface-2 hover:bg-line"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="font-mono text-sm font-bold">
                            {value} {opt.unitKey && s.qa.health.units[opt.unitKey]}
                          </span>
                          <button
                            type="button"
                            onClick={() => onChange(opt.id, value + (opt.step ?? 1))}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-surface-2 hover:bg-line"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Fila "Auto-registro" (réplica de `HealthAutoTrackFieldRow`) — abre
 * `AutoTrackModal`. Elegir cualquier métrica (no "Ninguna") es lo que
 * convierte el hábito en "de salud" al guardar. */
export function HealthAutoTrackFieldRow({
  s,
  metricId,
  target,
  onChange,
  showBorder,
}: {
  s: DemoStrings;
  metricId: string | null;
  target: number | null;
  onChange: (id: string | null, target: number | null) => void;
  showBorder?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const opt = findHealthMetricOption(metricId);
  return (
    <>
      <FieldRow icon={Heart} label={s.qa.fieldAutoTrack} value={opt ? s.qa.health.metrics[opt.key] : ''} onPress={() => setOpen(true)} showBorder={showBorder} />
      {open && <AutoTrackModal s={s} metricId={metricId} target={target} onChange={onChange} onClose={() => setOpen(false)} />}
    </>
  );
}
