import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { MonthGridCell } from '@/domain/calendarGrid';

const MAX_LABELS = 2;

interface MonthDayCellProps {
  cell: MonthGridCell;
  labels: string[];
}

export function MonthDayCell({ cell, labels }: MonthDayCellProps) {
  const { palette, font } = useTheme();

  const textColor = !cell.inCurrentMonth
    ? `${palette.textDim}4d`
    : cell.isToday
      ? '#fff'
      : cell.isWeekend
        ? palette.accent
        : palette.text;

  return (
    <View style={styles.cell}>
      {cell.isToday ? (
        <View style={[styles.todayCircle, { backgroundColor: palette.accent }]}>
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: textColor }}>{cell.day}</Text>
        </View>
      ) : (
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: textColor }}>{cell.day}</Text>
      )}
      {labels.slice(0, MAX_LABELS).map((label, i) => (
        <Text
          key={i}
          numberOfLines={1}
          style={{ fontFamily: font.medium, fontSize: 9, color: palette.accent, marginTop: 2, width: '100%' }}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2, minHeight: 56 },
  todayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
});
