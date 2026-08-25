import React from 'react';
import { Switch, Platform } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function Toggle({ value, onValueChange }: ToggleProps) {
  const { palette } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: palette.surfaceHigh, true: palette.accent }}
      thumbColor="#ffffff"
      ios_backgroundColor={palette.surfaceHigh}
      style={Platform.OS === 'android' ? { transform: [{ scaleX: 0.95 }, { scaleY: 0.95 }] } : undefined}
    />
  );
}
