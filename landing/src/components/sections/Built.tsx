import { Bell, Globe, Inbox, LayoutGrid, Moon, MoveVertical, Plus, Shield, Tag, type LucideIcon } from 'lucide-react';
import type { Dictionary } from '@/i18n/config';

type Key = keyof Dictionary['built']['items'];
const ICONS: Record<Key, LucideIcon> = {
  overdue: Inbox,
  quickAdd: Plus,
  widgets: LayoutGrid,
  badge: Bell,
  drag: MoveVertical,
  categories: Tag,
  theme: Moon,
  language: Globe,
  privacy: Shield,
};

export function Built({ t }: { t: Dictionary['built'] }) {
  return (
    <section id="detalles" className="flex w-full max-w-[760px] scroll-mt-10 flex-col gap-5 px-5 py-16 sm:gap-12 sm:py-28">
      <h2 className="text-[31px] font-extrabold tracking-[-0.03em] sm:text-[40px]">{t.title}</h2>
      <div className="grid grid-cols-1 border-t border-line sm:grid-cols-2 sm:gap-x-12 sm:gap-y-10 sm:border-0 lg:grid-cols-3">
        {(Object.keys(ICONS) as Key[]).map((key) => {
          const Icon = ICONS[key];
          const item = t.items[key];
          return (
            <div key={key} className="flex items-start gap-3.5 border-b border-line py-4 sm:flex-col sm:gap-2 sm:border-0 sm:py-0">
              <Icon size={18} className="mt-0.5 shrink-0 text-dim" aria-hidden />
              <div className="flex flex-col gap-1 sm:gap-2">
                <h3 className="text-base font-bold sm:mt-1">{item.t}</h3>
                <p className="text-sm leading-normal text-dim">{item.d}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
