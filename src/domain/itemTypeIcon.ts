import type { DayItemType } from './dayItem';
import type { IconName } from './iconNames';

export const DAY_ITEM_TYPE_ICON: Record<DayItemType, IconName> = {
  task: 'checklist',
  event: 'calendar-today',
  habit: 'sync-alt',
  note: 'sticky-note-2',
  voiceMemo: 'graphic-eq',
  moment: 'photo-camera',
};
