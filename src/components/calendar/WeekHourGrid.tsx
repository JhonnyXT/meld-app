import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typeColors } from '@/theme/tokens';
import { splitTimedAndUntimed } from '@/domain/weekGrid';
import { buildMultiDayBars } from '@/domain/monthMultiDayBars';
import { toDateKey } from '@/domain/date';
import { nowMinutes } from '@/domain/time';
import type { DayItem } from '@/domain/dayItem';

// ver docs/adr/0026-semana-grilla-horaria.md y docs/adr/0029-multi-dia-en-semana.md
const HOUR_HEIGHT = 56;
const TIME_COL_WIDTH = 32;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MAX_UNTIMED_VISIBLE = 2;
const BAR_HEIGHT = 16;
const BAR_GAP = 3;

interface WeekHourGridProps {
  days: Date[];
  itemsByDate: Record<string, DayItem[]>;
  onPressItem: (id: string) => void;
  onCreateAt: (dateKey: string, timeMinutes: number) => void;
}

function blockColor(item: DayItem): string {
  return item.categoryColor ?? typeColors[item.type];
}

function isMultiDay(item: DayItem): boolean {
  return item.type === 'event' && !!item.endDate;
}

export function WeekHourGrid({ days, itemsByDate, onPressItem, onCreateAt }: WeekHourGridProps) {
  const { palette, font } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const todayKey = toDateKey(new Date());
  const dateKeys = useMemo(() => days.map((d) => toDateKey(d)), [days]);

  // Al abrir, centra el scroll alrededor de la hora actual en vez de arrancar en 12am.
  useEffect(() => {
    const y = Math.max((nowMinutes() / 60) * HOUR_HEIGHT - HOUR_HEIGHT * 2, 0);
    scrollRef.current?.scrollTo({ y, animated: false });
  }, []);

  // Los eventos multi-día se dibujan como barra continua (como en Mes, ADR 0028),
  // no repetidos por día dentro de la grilla horaria — se excluyen de abajo.
  const { bars, laneCount } = useMemo(
    () => buildMultiDayBars({ cells: dateKeys.map((dateKey) => ({ dateKey })) }, itemsByDate),
    [dateKeys, itemsByDate],
  );
  const barsHeight = laneCount > 0 ? laneCount * (BAR_HEIGHT + BAR_GAP) : 0;

  const perDay = days.map((day) => {
    const dateKey = toDateKey(day);
    const singleDayItems = (itemsByDate[dateKey] ?? []).filter((item) => !isMultiDay(item));
    return { dateKey, ...splitTimedAndUntimed(singleDayItems) };
  });

  const hasUntimed = perDay.some((d) => d.untimed.length > 0);
  const currentTimeTop = (nowMinutes() / 60) * HOUR_HEIGHT;

  return (
    <View style={{ flex: 1 }}>
      {laneCount > 0 ? (
        <View style={styles.multiDayRow}>
          <View style={{ width: TIME_COL_WIDTH }} />
          <View style={[styles.multiDayBarsArea, { height: barsHeight }]}>
            {bars.map((bar) => {
              const color = blockColor(bar.item);
              return (
                <Pressable
                  key={bar.item.id}
                  onPress={() => onPressItem(bar.item.id)}
                  style={[
                    styles.multiDayBar,
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
                  <Text numberOfLines={1} style={[styles.multiDayBarText, { fontFamily: font.medium, color }]}>
                    {bar.item.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

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

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
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
                  <Pressable
                    key={h}
                    onPress={() => onCreateAt(d.dateKey, h * 60)}
                    style={[styles.hourLine, { height: HOUR_HEIGHT, borderColor: palette.border }]}
                  />
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
                {d.dateKey === todayKey ? (
                  <View style={[styles.nowLine, { top: currentTimeTop, backgroundColor: palette.accent }]} pointerEvents="none">
                    <View style={[styles.nowDot, { backgroundColor: palette.accent }]} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  multiDayRow: { flexDirection: 'row', paddingBottom: 6 },
  multiDayBarsArea: { flex: 1, position: 'relative' },
  multiDayBar: {
    position: 'absolute',
    borderRadius: 4,
    borderLeftWidth: 2,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  multiDayBarText: { fontSize: 10, lineHeight: 13 },
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
  nowLine: { position: 'absolute', left: 0, right: 0, height: 1.5 },
  nowDot: { position: 'absolute', left: -3, top: -3, width: 7, height: 7, borderRadius: 3.5 },
});
