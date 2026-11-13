import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function FieldSection({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  return <View style={[styles.card, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, marginBottom: 12, overflow: 'hidden' },
});
