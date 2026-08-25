import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { MonthGridCell } from '@/domain/calendarGrid';

interface DayPickerCellProps {
  cell: MonthGridCell;
  selected: boolean;
  onPress: () => void;
}

export function DayPickerCell({ cell, selected, onPress }: DayPickerCellProps) {
  const { palette, font } = useTheme();

  const textColor = !cell.inCurrentMonth
    ? `${palette.textDim}66`
    : selected
      ? '#fff'
      : cell.isToday
        ? palette.accent
        : cell.isWeekend
          ? palette.accent
          : palette.text;

  return (
    <Pressable onPress={onPress} style={styles.cell}>
      <View
        style={[
          styles.circle,
          selected && { backgroundColor: palette.accent },
          !selected && cell.isToday && { borderWidth: 1.5, borderColor: palette.accent },
        ]}
      >
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: textColor }}>{cell.day}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', height: 40 },
  circle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
