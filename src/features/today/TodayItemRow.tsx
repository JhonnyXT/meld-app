import React, { useState } from 'react';
import { Linking } from 'react-native';
import { DayItemRow } from '@/components/dayItem/DayItemRow';
import { useVoiceMemoPlayer } from '@/hooks/useVoiceMemoPlayer';
import { useTimeDragStore } from '@/store/timeDragStore';
import { useItemDetailStore } from '@/store/itemDetailStore';
import { useDayItemsStore } from '@/store/dayItemsStore';
import { nowMinutes, minutesTo12h } from '@/domain/time';
import { useTranslation } from '@/i18n';
import type { DayItem } from '@/domain/dayItem';
import { toRowViewModel, formatDuration, initialDragMinutes } from './mapDayItemToRow';

interface TodayItemRowProps {
  item: DayItem;
  onToggleComplete: (id: string) => void;
  /** Por default borra vía `dayItemsStore` (ítems del día seleccionado en
   * Today). Pasar un handler propio para reusar esta fila fuera de Today
   * (p. ej. la agenda semanal de Calendario, con ítems de fechas distintas). */
  onDelete?: (id: string) => void;
  onClearVoiceMemoAudio?: (id: string) => void;
  /** Solo aplica a hábitos — si ya se marcó hecho el día que se está viendo
   * y el handler para alternarlo. Sin esto (p. ej. reusando esta fila fuera
   * de Today) el ícono de hábito queda visual pero no tocable. */
  habitCompletedToday?: boolean;
  onToggleHabitComplete?: (id: string) => void;
}

export function TodayItemRow({
  item,
  onToggleComplete,
  onDelete,
  onClearVoiceMemoAudio,
  habitCompletedToday,
  onToggleHabitComplete,
}: TodayItemRowProps) {
  const { t } = useTranslation();
  const hasAudio = item.type === 'voiceMemo' && !!item.audioFileUri;
  const voice = useVoiceMemoPlayer(hasAudio ? (item as Extract<DayItem, { type: 'voiceMemo' }>).audioFileUri : undefined);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const isDraggingThis = useTimeDragStore((s) => s.active && s.itemId === item.id);
  const draggingMinutes = useTimeDragStore((s) => s.currentMinutes);
  const row = toRowViewModel(item, habitCompletedToday);

  if (isDraggingThis) {
    row.timeMarker = { kind: 'dragging', ...minutesTo12h(draggingMinutes) };
  }

  const trailing =
    item.type === 'voiceMemo'
      ? hasAudio
        ? {
            kind: 'playback' as const,
            label: formatDuration(item.durationSeconds),
            isPlaying: voice.isPlaying,
            onPress: () => {
              setPlayerExpanded(true);
              voice.toggle();
            },
          }
        : { kind: 'duration' as const, label: t('audioDeleted') }
      : row.trailing;

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
      trailing={trailing}
      hasLink={row.hasLink}
      completed={row.completed}
      playbackExpanded={playbackExpanded}
      onPress={() => useItemDetailStore.getState().open(item.id)}
      onToggleComplete={row.leading.kind === 'checkbox' ? () => onToggleComplete(item.id) : undefined}
      onToggleHabitComplete={
        row.leading.kind === 'habitIcon' && onToggleHabitComplete ? () => onToggleHabitComplete(item.id) : undefined
      }
      onLinkPress={item.type === 'task' && item.link ? () => Linking.openURL(item.link!) : undefined}
      onDashPress={() => useTimeDragStore.getState().start(item.id, initialDragMinutes(item, nowMinutes()))}
      onDelete={() => (onDelete ? onDelete(item.id) : useDayItemsStore.getState().remove(item.id))}
    />
  );
}
