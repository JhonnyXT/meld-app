import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { WeekdayHeaderRow } from '@/components/calendar/WeekdayHeaderRow';
import { DayPickerCell } from './DayPickerCell';
import { buildMonthGrid } from '@/domain/calendarGrid';
import { formatMonthYearLabel } from '@/domain/date';

interface MonthCalendarPickerProps {
  /** `null` = sin fecha seleccionada (p. ej. el ítem está en el Inbox). */
  selectedDateKey: string | null;
  onSelect: (dateKey: string) => void;
}

export function MonthCalendarPicker({ selectedDateKey, onSelect }: MonthCalendarPickerProps) {
  const { palette, font } = useTheme();
  const { lang } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const initial = selectedDateKey ? new Date(`${selectedDateKey}T00:00:00`) : today;
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth(), today), [cursor, today]);

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} hitSlop={8}>
          <Icon name="chevron-left" size={20} color={palette.textDim} />
        </Pressable>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.text }}>
          {formatMonthYearLabel(cursor, lang)}
        </Text>
        <Pressable onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} hitSlop={8}>
          <Icon name="chevron-right" size={20} color={palette.textDim} />
        </Pressable>
      </View>

      <WeekdayHeaderRow />

      <View style={styles.grid}>
        {grid.map((cell) => (
          <DayPickerCell
            key={cell.dateKey}
            cell={cell}
            selected={cell.dateKey === selectedDateKey}
            onPress={() => onSelect(cell.dateKey)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
