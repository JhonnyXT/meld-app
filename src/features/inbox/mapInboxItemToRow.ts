import type { IconName } from '@/domain/iconNames';
import type { DayItem } from '@/domain/dayItem';
import { formatRelativeCreated } from '@/domain/date';
import type { Language } from '@/i18n/translations';

export interface InboxRowViewModel {
  id: string;
  title: string;
  relativeLabel: string;
  link: string | null;
}

export const ICON_BY_TYPE: Record<DayItem['type'], IconName> = {
  task: 'description',
  note: 'description',
  event: 'event',
  habit: 'sync-alt',
  voiceMemo: 'graphic-eq',
  moment: 'photo-camera',
};

/** Inbox es captura rápida sin clasificar (el usuario decide el tipo real
 * recién al editar el ítem) — por eso la fila NO muestra un ícono de tipo,
 * a diferencia de Today/Search/Reminders que sí usan `ICON_BY_TYPE`. */
export function toInboxRowViewModel(item: DayItem, lang: Language = 'es'): InboxRowViewModel {
  return {
    id: item.id,
    title: item.title,
    relativeLabel: formatRelativeCreated(item.createdAt, lang),
    link: item.type === 'task' ? item.link : null,
  };
}
