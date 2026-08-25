import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';

const LABELS = { en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], es: ['L', 'M', 'M', 'J', 'V', 'S', 'D'] };

export function WeekdayHeaderRow() {
  const { palette, font } = useTheme();
  const { lang } = useTranslation();
  return (
    <View style={styles.row}>
      {LABELS[lang].map((label, i) => (
        <View key={i} style={styles.cell}>
          <Text
            style={{
              fontFamily: font.semibold,
              fontSize: 12,
              color: i >= 5 ? palette.accent : palette.textDim,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 16 },
  cell: { width: `${100 / 7}%`, alignItems: 'center' },
});
