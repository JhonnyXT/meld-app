import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { palette, font } = useTheme();

  return (
    <View style={styles.section}>
      <Text
        style={{
          fontFamily: font.semibold,
          fontSize: 12,
          color: palette.textDim,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: 8,
          marginLeft: 4,
        }}
      >
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 32 },
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
});
