import React, { useState } from 'react';
import { Linking } from 'react-native';
import { DayItemRow } from '@/components/dayItem/DayItemRow';
import { useVoiceMemoPlayer } from '@/hooks/useVoiceMemoPlayer';
import { useTimeDragStore } from '@/store/timeDragStore';
import { useItemDetailStore } from '@/store/itemDetailStore';
import { useDayItemsStore } from '@/store/dayItemsStore';
import { useCategoriesStore } from '@/store/categoriesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSession } from '@/sync';
import { nowMinutes, minutesTo12h } from '@/domain/time';
import { useTranslation } from '@/i18n';
import type { DayItem } from '@/domain/dayItem';
import { toRowViewModel, formatDuration, initialDragMinutes } from './mapDayItemToRow';

interface TodayItemRowProps {
  item: DayItem;
  onToggleComplete: (id: string) => void;
  onDelete?: (id: string) => void;
  onClearVoiceMemoAudio?: (id: string) => void;
  habitCompletedToday?: boolean;
  onToggleHabitComplete?: (id: string) => void;
  taskCompletedToday?: boolean;
  completedByUidOverride?: string | null;
}

export function TodayItemRow({
  item,
  onToggleComplete,
  onDelete,
  onClearVoiceMemoAudio,
  habitCompletedToday,
  onToggleHabitComplete,
  taskCompletedToday,
  completedByUidOverride,
}: TodayItemRowProps) {
  const { t } = useTranslation();
  const hasAudio = item.type === 'voiceMemo' && !!item.audioFileUri;
  const voice = useVoiceMemoPlayer(hasAudio ? (item as Extract<DayItem, { type: 'voiceMemo' }>).audioFileUri : undefined);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const isDraggingThis = useTimeDragStore((s) => s.active && s.itemId === item.id);
  const draggingMinutes = useTimeDragStore((s) => s.currentMinutes);
  const coolHabitsEnabled = useSettingsStore((s) => s.coolHabitsEnabled);
  const readOnlyLabels = useCategoriesStore((s) => s.readOnlyLabels);
  const readOnly = !!item.category && readOnlyLabels.has(item.category);

  const { user: sessionUser } = useSession();
  const completedByUidFromStore = useDayItemsStore((s) => s.completedByMap[item.id]);
  const completedByUid = completedByUidOverride !== undefined ? completedByUidOverride : completedByUidFromStore;
  const memberNames = useCategoriesStore((s) => s.memberNames);
  const completedByName =
    completedByUid && completedByUid !== sessionUser?.uid ? memberNames[completedByUid] : undefined;

  const row = toRowViewModel(item, habitCompletedToday, coolHabitsEnabled, taskCompletedToday, completedByName);

  if (isDraggingThis) {
    row.timeMarker = { kind: 'dragging', ...minutesTo12h(draggingMinutes) };
  }

  const isVoice = item.type === 'voiceMemo';
  const playback =
    isVoice && hasAudio
      ? {
          label: formatDuration((item as Extract<DayItem, { type: 'voiceMemo' }>).durationSeconds),
          isPlaying: voice.isPlaying,
          onPress: () => {
            setPlayerExpanded(true);
            voice.toggle();
          },
        }
      : undefined;
  const audioDeletedLabel = isVoice && !hasAudio ? t('audioDeleted') : undefined;
  const linkUrl = (item.type === 'task' || item.type === 'event') && item.link ? item.link : null;

  const playbackExpanded =
    hasAudio && playerExpanded
      ? {
          elapsedLabel: formatDuration(voice.currentTime),
          isPlaying: voice.isPlaying,
          onTogglePlay: voice.toggle,
          onDelete: () => {
            if (onClearVoiceMemoAudio) onClearVoiceMemoAudio(item.id);
            else useDayItemsStore.getState().clearVoiceMemoAudio(item.id);
            setPlayerExpanded(false);
          },
          onClose: () => {
            if (voice.isPlaying) voice.toggle();
            setPlayerExpanded(false);
          },
        }
      : undefined;

  return (
    <DayItemRow
      timeMarker={row.timeMarker}
      leading={row.leading}
      title={row.title}
      trailing={row.trailing}
      playback={playback}
      audioDeletedLabel={audioDeletedLabel}
      hasLink={row.hasLink}
      completed={row.completed}
      playbackExpanded={playbackExpanded}
      onPress={() => useItemDetailStore.getState().open(item.id)}
      onToggleComplete={row.leading.kind === 'checkbox' && !readOnly ? () => onToggleComplete(item.id) : undefined}
      onToggleHabitComplete={
        row.leading.kind === 'habitIcon' && onToggleHabitComplete && !readOnly ? () => onToggleHabitComplete(item.id) : undefined
      }
      onLinkPress={linkUrl ? () => Linking.openURL(linkUrl) : undefined}
      onDashPress={readOnly ? undefined : () => useTimeDragStore.getState().start(item.id, initialDragMinutes(item, nowMinutes()))}
      onDelete={readOnly ? undefined : () => (onDelete ? onDelete(item.id) : useDayItemsStore.getState().remove(item.id))}
    />
  );
}
