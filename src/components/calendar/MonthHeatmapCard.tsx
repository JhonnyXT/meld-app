import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { MONTH_SHORT } from '@/i18n/translations';
import type { MonthHeatmap } from '@/domain/calendarHeatmap';

const DOT_COLORS = {
  green: '#0aa665',
  red: '#ff5169',
} as const;

interface MonthHeatmapCardProps {
  heatmap: MonthHeatmap;
  highlighted?: boolean;
  onPress?: () => void;
}

export function MonthHeatmapCard({ heatmap, highlighted, onPress }: MonthHeatmapCardProps) {
  const { palette, font } = useTheme();
  const { lang } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: palette.surfaceLow },
        highlighted && { borderWidth: 1, borderColor: palette.accent },
      ]}
    >
      <View style={styles.header}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.text }}>
          {MONTH_SHORT[lang][heatmap.monthIndex]}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 10, color: palette.textDim }}>
          {heatmap.activeDaysLabel}
        </Text>
      </View>
      <View style={styles.grid}>
        {heatmap.dots.map((state, i) => (
          <View key={i} style={styles.dotCell}>
            <View
              style={[
                styles.dot,
                { backgroundColor: state === 'none' ? palette.surfaceHigh : DOT_COLORS[state] },
              ]}
            />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, padding: 12, gap: 8, aspectRatio: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // 7 columnas exactas, sin depender del ancho de la tarjeta (equivalente a grid-template-columns: repeat(7, 1fr)).
  dotCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
