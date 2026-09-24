'use client';

import { AudioLines, Calendar, Check, FileText, Repeat, type LucideIcon } from 'lucide-react';
import { QUICK_ADD_TYPES, type ItemType } from '../model';
import type { DemoStrings } from '../strings';

const TYPE_ICON: Record<ItemType, LucideIcon> = { task: Check, event: Calendar, voiceMemo: AudioLines, note: FileText, habit: Repeat };
const PAD = 6;
const GAP = 4;
const COUNT = QUICK_ADD_TYPES.length;

/** Switch de tipo (réplica de `TypeTabs`): un solo "thumb" que se desliza a
 * la posición del tipo activo, con los 5 íconos encima. En la app el thumb
 * también sigue el dedo mientras se arrastra por el track; acá alcanza con
 * el toque directo de cada ícono (suficiente para una demo web). */
export function TypeTabs({ s, value, onChange }: { s: DemoStrings; value: ItemType; onChange: (type: ItemType) => void }) {
  const index = QUICK_ADD_TYPES.indexOf(value);
  return (
    <div role="tablist" aria-label={s.add} className="relative mb-5 flex rounded-2xl bg-surface-2 p-[6px]" style={{ gap: GAP }}>
      <div
        aria-hidden
        className="absolute top-[6px] bottom-[6px] rounded-xl bg-coral-btn transition-[left] duration-200 ease-out"
        style={{
          width: `calc((100% - ${2 * PAD}px - ${(COUNT - 1) * GAP}px) / ${COUNT})`,
          left: `calc(${PAD}px + ${index} * (100% - ${2 * PAD}px - ${(COUNT - 1) * GAP}px) / ${COUNT} + ${index * GAP}px)`,
        }}
      />
      {QUICK_ADD_TYPES.map((type) => {
        const Icon = TYPE_ICON[type];
        const active = type === value;
        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={s.types[type]}
            onClick={() => onChange(type)}
            className="relative z-10 flex h-10 flex-1 cursor-pointer items-center justify-center"
          >
            <Icon size={19} className={active ? 'text-white' : 'text-dim'} />
          </button>
        );
      })}
    </div>
  );
}
