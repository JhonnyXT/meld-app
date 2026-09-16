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
              numberOfLines={1}
              style={{
                fontFamily: font.semibold,
                fontSize: 13,
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
  track: { flexDirection: 'row', width: '100%', borderRadius: 12, padding: 4, gap: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8 },
});
