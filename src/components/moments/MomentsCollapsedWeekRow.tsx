import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { addDays } from '@/domain/date';
import type { WeekInfo } from '@/domain/week';

interface MomentsCollapsedWeekRowProps {
  week: WeekInfo;
}

export function MomentsCollapsedWeekRow({ week }: MomentsCollapsedWeekRowProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.start, i).getDate());

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('weekNumber', { n: week.weekNumber })}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>{week.label}</Text>
      </View>
      <View style={styles.strip}>
        {days.map((day, i) => {
          const isFirst = i === 0;
          const isLast = i === days.length - 1;
          return (
            <View
              key={i}
              style={[
                styles.chip,
                { backgroundColor: palette.surface },
                isFirst && { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
                isLast && { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
                !isFirst && { borderLeftWidth: 1, borderLeftColor: palette.bg },
              ]}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: palette.textDim }}>{day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, opacity: 0.4 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  strip: { flexDirection: 'row' },
  chip: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
});
