import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useCalendarFilterStore } from '@/store/calendarFilterStore';
import { useTimeDragStore } from '@/store/timeDragStore';
import { useUndoStore } from '@/store/undoStore';
import {
  FLOATING_BAR_MARGIN,
  FLOATING_BAR_HEIGHT,
  FLOATING_BAR_CONFIRM_ROW_HEIGHT,
  FLOATING_BAR_ROW_GAP,
} from '@/components/floatingBarGeometry';

const TYPE_ICON: Record<string, IconName> = {
  task: 'description',
  event: 'event',
  note: 'sticky-note-2',
  voiceMemo: 'graphic-eq',
  moment: 'photo-camera',
};

const TYPE_LABEL_KEY: Record<string, 'filterTasks' | 'filterEvents' | 'filterNotes' | 'filterVoiceNotes' | 'filterMoments'> = {
  task: 'filterTasks',
  event: 'filterEvents',
  note: 'filterNotes',
  voiceMemo: 'filterVoiceNotes',
  moment: 'filterMoments',
};

export function CalendarFilterBar() {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const filter = useCalendarFilterStore((s) => s.filter);
  const open = useCalendarFilterStore((s) => s.openSheet);
  const dragging = useTimeDragStore((s) => s.active);
  const undoVisible = useUndoStore((s) => s.visible);

  // Sin ícono propio cuando el filtro es "Todo" — mostrarlo repetía el
  // mismo ícono de embudo dos veces en la pill ("⧩ Filtro | ⧩ Todo", bug
  // real reportado). Solo type/habit tienen un ícono específico que vale la
  // pena destacar como selección actual.
  const currentIcon: IconName | null = filter.kind === 'habit' ? 'sync-alt' : filter.kind === 'type' ? TYPE_ICON[filter.itemType] : null;
  const currentLabel = filter.kind === 'habit' ? filter.title : filter.kind === 'type' ? t(TYPE_LABEL_KEY[filter.itemType]) : t('filterEverything');

  // Mientras hay un arrastre de hora activo O una tarjeta de Undo visible,
  // FloatingBar crece hacia arriba (agrega una fila + divisor) — sumar esa
  // altura acá para no quedar tapado detrás (bug real reportado, la barra de
  // filtro se superponía con "Confirmar"; mismo caso con Undo).
  const extraDragHeight = dragging || undoVisible ? FLOATING_BAR_CONFIRM_ROW_HEIGHT + FLOATING_BAR_ROW_GAP : 0;

  return (
    <View
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom, FLOATING_BAR_MARGIN) + FLOATING_BAR_HEIGHT + 12 + extraDragHeight },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={open}
        style={[styles.pill, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Icon name="filter-list" size={16} color={palette.textDim} />
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: palette.textDim }}>{t('filterLabel')}</Text>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        {currentIcon ? <Icon name={currentIcon} size={16} color={palette.text} /> : null}
        <Text numberOfLines={1} style={[styles.currentLabel, { fontFamily: font.semibold, color: palette.text }]}>
          {currentLabel}
        </Text>
        <Icon name="chevron-down" size={16} color={palette.textDim} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 40,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  divider: { width: 1, height: 16 },
  currentLabel: { fontSize: 13, flexShrink: 1, maxWidth: 140 },
});
