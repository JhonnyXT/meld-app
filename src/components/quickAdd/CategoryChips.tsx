import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { QUICK_ADD_CATEGORIES } from '@/domain/quickAdd';

interface CategoryChipsProps {
  value: string | null;
  onChange: (label: string, color: string) => void;
  /** Cuando es `true`, agrega un divisor debajo (mismo patrón que las filas de
   * campo) para separar visualmente de la sección siguiente (p. ej. Prioridad). */
  showBorder?: boolean;
}

export function CategoryChips({ value, onChange, showBorder }: CategoryChipsProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={showBorder ? [styles.bordered, { borderBottomColor: palette.border }] : undefined}>
      <View style={styles.header}>
        <Icon name="folder" size={20} color={palette.textDim} />
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: palette.text }}>{t('fieldCategory')}</Text>
      </View>
      <View style={styles.row}>
        {QUICK_ADD_CATEGORIES.map((cat) => {
          const active = cat.label === value;
          return (
            <Pressable
              key={cat.label}
              onPress={() => onChange(cat.label, cat.color)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? palette.accent : 'transparent',
                  borderColor: active ? palette.accent : palette.border,
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: active ? '#fff' : cat.color }]} />
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: active ? '#fff' : palette.text }}>
                {t(cat.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bordered: { paddingBottom: 14, borderBottomWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
