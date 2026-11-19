import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MonthDayCell } from './MonthDayCell';
import type { WeekRow } from '@/domain/calendarGrid';
import type { DayItem } from '@/domain/dayItem';

interface MonthWeekRowProps {
  week: WeekRow;
  itemsByDate: Record<string, DayItem[]>;
  onPressDay: (dateKey: string) => void;
  onPressItem: (id: string) => void;
  onPressOverflow: (dateKey: string) => void;
}

export function MonthWeekRow({ week, itemsByDate, onPressDay, onPressItem, onPressOverflow }: MonthWeekRowProps) {
  return (
    <View style={styles.row}>
      {week.cells.map((cell) => (
        <MonthDayCell
          key={cell.dateKey}
          cell={cell}
          items={itemsByDate[cell.dateKey] ?? []}
          onPressDay={onPressDay}
          onPressItem={onPressItem}
          onPressOverflow={onPressOverflow}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 22 },
});
