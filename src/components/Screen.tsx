import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

interface ScreenProps extends ViewProps {
  background?: React.ReactNode;
}

export function Screen({ style, children, background, ...rest }: ScreenProps) {
  const { palette } = useTheme();
  return (
    <View style={styles.root}>
      {background ? <View style={StyleSheet.absoluteFill}>{background}</View> : null}
      <SafeAreaView
        style={[styles.safe, { backgroundColor: background ? 'transparent' : palette.bg }]}
        edges={['top', 'left', 'right']}
      >
        <View style={[styles.content, style]} {...rest}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
});
