import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typeColors } from '@/theme/tokens';
import { splitTimedAndUntimed } from '@/domain/weekGrid';
import { toDateKey } from '@/domain/date';
import type { DayItem } from '@/domain/dayItem';

// ver docs/adr/0026-semana-grilla-horaria.md
const HOUR_HEIGHT = 56;
const TIME_COL_WIDTH = 32;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MAX_UNTIMED_VISIBLE = 2;

interface WeekHourGridProps {
  days: Date[];
  itemsByDate: Record<string, DayItem[]>;
  onPressItem: (id: string) => void;
}

function blockColor(item: DayItem): string {
  return item.categoryColor ?? typeColors[item.type];
}

export function WeekHourGrid({ days, itemsByDate, onPressItem }: WeekHourGridProps) {
  const { palette, font } = useTheme();

  const perDay = days.map((day) => {
    const dateKey = toDateKey(day);
    return { dateKey, ...splitTimedAndUntimed(itemsByDate[dateKey] ?? []) };
  });

  const hasUntimed = perDay.some((d) => d.untimed.length > 0);

  return (
    <View style={{ flex: 1 }}>
      {hasUntimed ? (
        <View style={styles.untimedRow}>
          <View style={{ width: TIME_COL_WIDTH }} />
          {perDay.map((d) => {
            const overflow = d.untimed.length - MAX_UNTIMED_VISIBLE;
            return (
              <View key={d.dateKey} style={styles.dayCol}>
                {d.untimed.slice(0, MAX_UNTIMED_VISIBLE).map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => onPressItem(item.id)}
                    style={[styles.untimedChip, { backgroundColor: `${blockColor(item)}26` }]}
                  >
                    <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 9.5, color: blockColor(item) }}>
                      {item.title}
                    </Text>
                  </Pressable>
                ))}
                {overflow > 0 ? (
                  <Text style={{ fontFamily: font.semibold, fontSize: 9, color: palette.textDim }}>+{overflow}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: TIME_COL_WIDTH }}>
            {HOURS.map((h) => (
              <View key={h} style={{ height: HOUR_HEIGHT }}>
                {h > 0 ? (
                  <Text style={{ fontFamily: font.regular, fontSize: 11, color: palette.textDim, marginTop: -7 }}>
                    {h % 12 === 0 ? 12 : h % 12}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {perDay.map((d) => (
              <View key={d.dateKey} style={[styles.dayGridCol, { borderColor: palette.border }]}>
                {HOURS.map((h) => (
                  <View key={h} style={[styles.hourLine, { height: HOUR_HEIGHT, borderColor: palette.border }]} />
                ))}
                {d.timed.map((block) => {
                  const color = blockColor(block.item);
                  const top = (block.startMinutes / 60) * HOUR_HEIGHT;
                  const height = Math.max((block.durationMinutes / 60) * HOUR_HEIGHT, 22);
                  return (
                    <Pressable
                      key={block.item.id}
                      onPress={() => onPressItem(block.item.id)}
                      style={[
                        styles.block,
                        { top, height, backgroundColor: `${color}33`, borderLeftColor: color },
                      ]}
                    >
                      <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 10, color }}>
                        {block.item.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  untimedRow: { flexDirection: 'row', paddingBottom: 6 },
  dayCol: { flex: 1, gap: 2, paddingHorizontal: 1 },
  untimedChip: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 2 },
  dayGridCol: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth },
  hourLine: { borderTopWidth: StyleSheet.hairlineWidth },
  block: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 4,
    borderLeftWidth: 2,
    padding: 3,
    overflow: 'hidden',
  },
});
