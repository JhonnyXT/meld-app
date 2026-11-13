import React, { type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface ScreenHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({ title, subtitle, right, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>{title}</View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {subtitle ? <View style={styles.subtitle}>{subtitle}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 20, paddingBottom: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleLeft: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  subtitle: { marginTop: 4 },
});
