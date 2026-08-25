import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { QUICK_ADD_META, QUICK_ADD_TYPES, type QuickAddType } from '@/domain/quickAdd';

interface TypeTabsProps {
  value: QuickAddType;
  onChange: (type: QuickAddType) => void;
}

export function TypeTabs({ value, onChange }: TypeTabsProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={[styles.track, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
        {QUICK_ADD_TYPES.map((type) => {
          const active = type === value;
          return (
            <Pressable
              key={type}
              onPress={() => onChange(type)}
              style={[styles.tab, active && { backgroundColor: palette.accent }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(QUICK_ADD_META[type].tabLabelKey)}
            >
              <Icon name={QUICK_ADD_META[type].icon} size={22} color={active ? "#fff" : palette.textDim} />
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: palette.textDim, textAlign: 'center', marginTop: 8 }}>
        {t(QUICK_ADD_META[value].tabLabelKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 20, padding: 6, gap: 4, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
