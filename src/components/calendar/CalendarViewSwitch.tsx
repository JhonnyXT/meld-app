import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation, type TranslationKey } from '@/i18n';
import type { CalendarView } from '@/features/calendar/calendarView';

const OPTIONS: { value: CalendarView; icon: IconName; labelKey: TranslationKey }[] = [
  { value: 'month', icon: 'calendar-month', labelKey: 'a11yCalendarMonthView' },
  { value: 'week', icon: 'view-week', labelKey: 'a11yCalendarWeekView' },
  { value: 'year', icon: 'view-grid', labelKey: 'a11yCalendarYearView' },
];

interface CalendarViewSwitchProps {
  value: CalendarView;
  onChange: (value: CalendarView) => void;
}

export function CalendarViewSwitch({ value, onChange }: CalendarViewSwitchProps) {
  const { palette } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.track, { backgroundColor: palette.surfaceLow }]}>
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.box,
              active && { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(opt.labelKey)}
          >
            <Icon name={opt.icon} size={16} color={active ? palette.text : palette.textDim} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  box: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
