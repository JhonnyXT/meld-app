import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typeColors } from '@/theme/tokens';
import type { MonthGridCell } from '@/domain/calendarGrid';
import type { DayItem } from '@/domain/dayItem';

// ver docs/adr/0025-calendario-scroll-continuo.md
const MAX_VISIBLE_CHIPS = 3;

interface MonthDayCellProps {
  cell: MonthGridCell;
  items: DayItem[];
  onPressDay?: (dateKey: string) => void;
  onPressItem?: (id: string) => void;
  onPressOverflow?: (dateKey: string) => void;
}

function chipColor(item: DayItem): string {
  return item.categoryColor ?? typeColors[item.type];
}

export function MonthDayCell({ cell, items, onPressDay, onPressItem, onPressOverflow }: MonthDayCellProps) {
  const { palette, font } = useTheme();

  const moment = items.find((item) => item.type === 'moment');
  const otherItems = items.filter((item) => item.type !== 'moment');
  const visibleItems = otherItems.slice(0, MAX_VISIBLE_CHIPS);
  const overflowCount = otherItems.length - visibleItems.length;

  const textColor = !cell.inCurrentMonth
    ? `${palette.textDim}4d`
    : cell.isToday
      ? '#fff'
      : cell.isWeekend
        ? palette.accent
        : palette.text;

  return (
    <Pressable style={styles.cell} onPress={onPressDay ? () => onPressDay(cell.dateKey) : undefined}>
      <View style={styles.headerRow}>
        {cell.isToday ? (
          <View style={[styles.todayCircle, { backgroundColor: palette.accent }]}>
            <Text style={{ fontFamily: font.bold, fontSize: 16, color: textColor }}>{cell.day}</Text>
          </View>
        ) : (
          <Text style={{ fontFamily: font.medium, fontSize: 16, color: textColor }}>{cell.day}</Text>
        )}
        {moment ? <Image source={{ uri: moment.mediaUri }} style={styles.thumb} /> : null}
      </View>

      <View style={styles.chips}>
        {visibleItems.map((item, i) => {
          const color = chipColor(item);
          return (
            <Pressable
              key={item.id ?? i}
              onPress={onPressItem ? () => onPressItem(item.id) : undefined}
              hitSlop={2}
              style={[styles.chip, { backgroundColor: `${color}26` }]}
            >
              <Text style={[styles.chipText, { fontFamily: font.medium, color }]} numberOfLines={1}>
                {item.title}
              </Text>
            </Pressable>
          );
        })}
        {overflowCount > 0 ? (
          <Pressable
            onPress={onPressOverflow ? () => onPressOverflow(cell.dateKey) : undefined}
            hitSlop={4}
            style={styles.overflowBtn}
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: palette.textDim }}>+{overflowCount}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { width: `${100 / 7}%`, paddingHorizontal: 3, paddingTop: 8, paddingBottom: 10, gap: 7 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  todayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 17, height: 17, borderRadius: 3 },
  chips: { gap: 4 },
  chip: { borderRadius: 5, paddingHorizontal: 4, paddingVertical: 3 },
  chipText: { fontSize: 11, lineHeight: 14 },
  overflowBtn: { paddingHorizontal: 2, paddingVertical: 1 },
});
