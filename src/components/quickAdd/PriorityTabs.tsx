import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { PRIORITY_OPTIONS } from '@/domain/quickAdd';
import type { PriorityLevel } from '@/domain/dayItem';

interface PriorityTabsProps {
  value: PriorityLevel;
  onChange: (value: PriorityLevel) => void;
}

export function PriorityTabs({ value, onChange }: PriorityTabsProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  return (
    <View>
      <View style={styles.header}>
        <Icon name="flag" size={20} color={palette.textDim} />
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: palette.text }}>{t('fieldPriority')}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        {PRIORITY_OPTIONS.map((opt) => {
          const active = opt.id === value;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id)}
              style={[styles.tab, active && { backgroundColor: palette.accent }]}
            >
              <Icon name="flag" size={12} color={active ? '#fff' : opt.color} />
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: active ? '#fff' : palette.textDim }}>
                {t(opt.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  track: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4, borderWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
});
