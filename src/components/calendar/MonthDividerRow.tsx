import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function MonthDividerRow({ label }: { label: string }) {
  const { palette, font } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={{ fontFamily: font.bold, fontSize: 14, color: palette.textDim, textTransform: 'capitalize' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 16, paddingBottom: 6 },
});
