import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MonthDayCell, CELL_TOP_OFFSET } from './MonthDayCell';
import { useTheme } from '@/theme/ThemeProvider';
import { typeColors } from '@/theme/tokens';
import { buildMultiDayBars } from '@/domain/monthMultiDayBars';
import type { WeekRow } from '@/domain/calendarGrid';
import type { DayItem } from '@/domain/dayItem';

// ver docs/adr/0028-barra-continua-multi-dia.md
const BAR_HEIGHT = 15;
const BAR_GAP = 3;

interface MonthWeekRowProps {
  week: WeekRow;
  itemsByDate: Record<string, DayItem[]>;
  onPressDay: (dateKey: string) => void;
  onPressItem: (id: string) => void;
  onPressOverflow: (dateKey: string) => void;
}

export function MonthWeekRow({ week, itemsByDate, onPressDay, onPressItem, onPressOverflow }: MonthWeekRowProps) {
  const { font } = useTheme();
  const { bars, laneCount } = useMemo(() => buildMultiDayBars(week, itemsByDate), [week, itemsByDate]);
  const reservedHeight = laneCount > 0 ? laneCount * (BAR_HEIGHT + BAR_GAP) : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {week.cells.map((cell) => (
          <MonthDayCell
            key={cell.dateKey}
            cell={cell}
            items={itemsByDate[cell.dateKey] ?? []}
            onPressDay={onPressDay}
            onPressItem={onPressItem}
            onPressOverflow={onPressOverflow}
            multiDayReservedHeight={reservedHeight}
          />
        ))}
      </View>
      {laneCount > 0 ? (
        <View style={[styles.barsOverlay, { top: CELL_TOP_OFFSET }]} pointerEvents="box-none">
          {bars.map((bar) => {
            const color = bar.item.categoryColor ?? typeColors[bar.item.type];
            return (
              <Pressable
                key={bar.item.id}
                onPress={() => onPressItem(bar.item.id)}
                style={[
                  styles.bar,
                  {
                    left: `${(bar.startCol / 7) * 100}%`,
                    width: `${((bar.endCol - bar.startCol + 1) / 7) * 100}%`,
                    top: bar.lane * (BAR_HEIGHT + BAR_GAP),
                    height: BAR_HEIGHT,
                    backgroundColor: `${color}33`,
                    borderLeftColor: color,
                  },
                ]}
              >
                <Text numberOfLines={1} style={[styles.barText, { fontFamily: font.medium, color }]}>
                  {bar.item.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 22 },
  row: { flexDirection: 'row' },
  barsOverlay: { position: 'absolute', left: 3, right: 3 },
  bar: {
    position: 'absolute',
    borderRadius: 4,
    borderLeftWidth: 2,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  barText: { fontSize: 10.5, lineHeight: 13 },
});
