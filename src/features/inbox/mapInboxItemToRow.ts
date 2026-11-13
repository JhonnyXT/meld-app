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

export function toInboxRowViewModel(item: DayItem, lang: Language = 'es'): InboxRowViewModel {
  return {
    id: item.id,
    title: item.title,
    relativeLabel: formatRelativeCreated(item.createdAt, lang),
    link: item.type === 'task' ? item.link : null,
  };
}
