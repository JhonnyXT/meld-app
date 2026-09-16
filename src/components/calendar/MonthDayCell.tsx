import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typeColors } from '@/theme/tokens';
import type { MonthGridCell } from '@/domain/calendarGrid';
import type { DayItem } from '@/domain/dayItem';

const MAX_DOTS = 3;

interface MonthDayCellProps {
  cell: MonthGridCell;
  items: DayItem[];
  onPress?: (dateKey: string) => void;
}

/** Celda de la grilla de Mes — fiel al mock de Pen "Calendar Screen":
 * puntos de color arriba del número (uno por ítem que NO sea Moment ese día,
 * coloreado con el color fijo de su TIPO — `typeColors`, no la categoría —
 * tope `MAX_DOTS`) y, debajo, la miniatura de
 * la foto del Moment de ese día si existe (mismo patrón de `Image` que
 * `MomentsDayRow`, no un color plano de placeholder). Tocar la celda navega
 * al día (`onPress`, opcional — sin él la celda queda solo visual). */
export function MonthDayCell({ cell, items, onPress }: MonthDayCellProps) {
  const { palette, font } = useTheme();

  const moment = items.find((item) => item.type === 'moment');
  const otherItems = items.filter((item) => item.type !== 'moment');

  const textColor = !cell.inCurrentMonth
    ? `${palette.textDim}4d`
    : cell.isToday
      ? '#fff'
      : cell.isWeekend
        ? palette.accent
        : palette.text;

  return (
    <Pressable style={styles.cell} onPress={onPress ? () => onPress(cell.dateKey) : undefined}>
      <View style={styles.dotsRow}>
        {otherItems.slice(0, MAX_DOTS).map((item, i) => (
          <View key={item.id ?? i} style={[styles.dot, { backgroundColor: typeColors[item.type] }]} />
        ))}
      </View>
      {cell.isToday ? (
        <View style={[styles.todayCircle, { backgroundColor: palette.accent }]}>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: textColor }}>{cell.day}</Text>
        </View>
      ) : (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: textColor }}>{cell.day}</Text>
      )}
      {moment ? (
        <Image source={{ uri: moment.mediaUri }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2, gap: 2, minHeight: 50 },
  dotsRow: { flexDirection: 'row', gap: 2, height: 4, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  todayCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 18, height: 18, borderRadius: 4 },
  thumbPlaceholder: { width: 18, height: 18 },
});
