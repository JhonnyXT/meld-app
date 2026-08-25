import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { toDateKey } from '@/domain/date';
import { matchesCalendarFilter, type CalendarFilter } from '@/store/calendarFilterStore';
import type { DayItem } from '@/domain/dayItem';

const WEEKDAY_INITIAL = { en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], es: ['L', 'M', 'M', 'J', 'V', 'S', 'D'] };

interface WeekDaySelectorProps {
  days: Date[];
  itemsByDate: Record<string, DayItem[]>;
  filter: CalendarFilter;
  onSelectDay: (dateKey: string) => void;
}

export function WeekDaySelector({ days, itemsByDate, filter, onSelectDay }: WeekDaySelectorProps) {
  const { palette, font } = useTheme();
  const { lang } = useTranslation();
  const todayKey = toDateKey(new Date());

  return (
    <View style={styles.row}>
      {days.map((day, i) => {
        const key = toDateKey(day);
        const isToday = key === todayKey;
        const hasItems = (itemsByDate[key] ?? []).some((item) => matchesCalendarFilter(item, filter));
        return (
          <Pressable key={key} onPress={() => onSelectDay(key)} style={styles.item}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: palette.textDim }}>
              {WEEKDAY_INITIAL[lang][i]}
            </Text>
            <View style={[styles.circle, isToday && { backgroundColor: palette.accent }]}>
              <Text style={{ fontFamily: font.bold, fontSize: 15, color: isToday ? '#fff' : palette.text }}>
                {day.getDate()}
              </Text>
            </View>
            <View style={[styles.dot, { backgroundColor: hasItems ? palette.textDim : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16 },
  item: { alignItems: 'center', gap: 6 },
  circle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
