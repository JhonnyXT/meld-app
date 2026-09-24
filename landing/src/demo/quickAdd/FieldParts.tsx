'use client';

import { ArrowUpRight, Check, ChevronDown, ChevronUp, Flag, Folder, Link2, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { CATEGORY_COLOR, PRIORITY_COLOR, type CategoryId, type PriorityLevel } from '../model';
import type { DemoStrings } from '../strings';

// ─── Fila base (réplica de `FieldRow`) ──────────────────────────────────────
export function FieldRow({
  icon: Icon,
  label,
  value,
  onPress,
  showBorder = true,
  expanded,
  onClear,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress: () => void;
  showBorder?: boolean;
  expanded?: boolean;
  onClear?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex w-full cursor-pointer items-center justify-between py-3.5 text-left ${showBorder ? 'border-b border-line' : ''}`}
    >
      <span className="flex items-center gap-3">
        <Icon size={20} className="text-dim" aria-hidden />
        <span className="text-[15px] font-medium">{label}</span>
      </span>
      <span className="flex items-center gap-0.5">
        <span className="text-sm text-dim">{value}</span>
        {onClear && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.stopPropagation();
              onClear();
            }}
            aria-label="×"
            className="ml-1 cursor-pointer p-0.5 text-dim"
          >
            <X size={14} />
          </span>
        )}
        {expanded !== undefined && (expanded ? <ChevronUp size={18} className="text-dim" /> : <ChevronDown size={18} className="text-dim" />)}
      </span>
    </button>
  );
}

// ─── Acordeón de presets fijos (réplica de `PresetFieldRow`) ────────────────
export function PresetAccordion({
  icon,
  label,
  options,
  value,
  labels,
  onChange,
  showBorder = true,
}: {
  icon: LucideIcon;
  label: string;
  options: readonly string[];
  value: string;
  labels: Record<string, string>;
  onChange: (value: string) => void;
  showBorder?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="animate-row-in">
      <FieldRow icon={icon} label={label} value={labels[value] ?? value} onPress={() => setExpanded((e) => !e)} showBorder={expanded || showBorder} expanded={expanded} />
      {expanded && (
        <div className="animate-row-in pb-1 pl-8">
          {options.map((opt, i) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setExpanded(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between py-3 text-left ${i < options.length - 1 || showBorder ? 'border-b border-line' : ''}`}
              >
                <span className={`text-sm ${selected ? 'font-medium text-coral' : 'text-dim'}`}>{labels[opt] ?? opt}</span>
                {selected && <Check size={17} className="text-coral" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Categoría (réplica de `CategoryChips`) ─────────────────────────────────
export function CategoryAccordion({
  s,
  value,
  onChange,
  showBorder,
}: {
  s: DemoStrings;
  value: CategoryId | null;
  onChange: (value: CategoryId | null) => void;
  showBorder?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const chip = (active: boolean) =>
    `flex cursor-pointer items-center gap-[7px] rounded-full border-[1.5px] px-4 py-[9px] text-[13px] font-medium ${
      active ? 'border-coral bg-coral-btn text-white' : 'border-line text-ink'
    }`;
  return (
    <div className="animate-row-in">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`flex w-full cursor-pointer items-center justify-between py-3.5 text-left ${!expanded && showBorder ? 'border-b border-line' : ''}`}
      >
        <span className="flex items-center gap-3">
          <Folder size={20} className="text-dim" aria-hidden />
          <span className="text-[15px] font-medium">{s.qa.fieldCategory}</span>
        </span>
        <span className="flex items-center gap-0.5">
          {value && <span className="text-sm text-dim">{s.categories[value]}</span>}
          {expanded ? <ChevronUp size={18} className="text-dim" /> : <ChevronDown size={18} className="text-dim" />}
        </span>
      </button>
      {expanded && (
        <div className={`animate-row-in flex flex-wrap gap-2.5 pt-0.5 pb-1 ${showBorder ? 'border-b border-line pb-3.5' : ''}`}>
          {(Object.keys(CATEGORY_COLOR) as CategoryId[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setExpanded(false);
              }}
              className={chip(value === c)}
            >
              <span className="size-1.5 rounded-full" style={{ background: value === c ? '#fff' : CATEGORY_COLOR[c] }} />
              {s.categories[c]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Prioridad (réplica de `PriorityTabs`) ──────────────────────────────────
export function PriorityAccordion({ s, value, onChange }: { s: DemoStrings; value: PriorityLevel; onChange: (value: PriorityLevel) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="animate-row-in">
      <button type="button" onClick={() => setExpanded((e) => !e)} className="flex w-full cursor-pointer items-center justify-between py-3.5 text-left">
        <span className="flex items-center gap-3">
          <Flag size={20} className="text-dim" aria-hidden />
          <span className="text-[15px] font-medium">{s.qa.fieldPriority}</span>
        </span>
        <span className="flex items-center gap-0.5">
          <span className="text-sm text-dim">{s.priorities[value]}</span>
          {expanded ? <ChevronUp size={18} className="text-dim" /> : <ChevronDown size={18} className="text-dim" />}
        </span>
      </button>
      {expanded && (
        <div className="animate-row-in mb-1 flex gap-1 rounded-2xl border border-line bg-bg p-1">
          {(['none', 'low', 'medium', 'high'] as PriorityLevel[]).map((p) => {
            const active = p === value;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onChange(p);
                  setExpanded(false);
                }}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold ${
                  active ? 'bg-coral-btn text-white' : 'text-dim'
                }`}
              >
                <Flag size={12} style={{ color: active ? '#fff' : PRIORITY_COLOR[p] }} fill={active ? '#fff' : PRIORITY_COLOR[p]} />
                {s.priorities[p]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Enlace (réplica de `LinkFieldRow`) — Task y Event ──────────────────────
export function LinkFieldRow({ s, value, onChange, showBorder = true }: { s: DemoStrings; value: string; onChange: (value: string) => void; showBorder?: boolean }) {
  const trimmed = value.trim();
  return (
    <div className={`flex items-center gap-3 py-3.5 ${showBorder ? 'border-b border-line' : ''}`}>
      <Link2 size={20} className="shrink-0 text-dim" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={s.qa.fieldLink}
        inputMode="url"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-dim focus:outline-none"
      />
      {trimmed.length > 0 && (
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.qa.openLink}
          className="flex size-[26px] shrink-0 items-center justify-center rounded-lg bg-surface-2 text-dim"
        >
          <ArrowUpRight size={14} />
        </a>
      )}
    </div>
  );
}
