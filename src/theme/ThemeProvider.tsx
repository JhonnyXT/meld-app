import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { getPalette, spacing, radius, typeScale, fontFamily, type Palette } from './tokens';

interface ThemeContextValue {
  palette: Palette;
  scheme: 'light' | 'dark';
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof typeScale;
  font: typeof fontFamily;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const accent = useSettingsStore((s) => s.accent);

  const scheme: 'light' | 'dark' =
    themePreference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themePreference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      palette: getPalette(scheme, accent),
      scheme,
      spacing,
      radius,
      type: typeScale,
      font: fontFamily,
    }),
    [scheme, accent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
