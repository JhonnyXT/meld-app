import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface SegmentedToggleProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedToggle<T extends string>({ options, value, onChange }: SegmentedToggleProps<T>) {
  const { palette, font } = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: palette.surfaceLow }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              active && {
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.border,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: font.semibold,
                fontSize: 12,
                color: active ? palette.text : palette.textDim,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 8, padding: 4, gap: 4 },
  segment: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
});
