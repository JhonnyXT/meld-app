import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { FloatingBar } from './FloatingBar';

interface DayBarProps {
  dateLabel: string;
  doneLabel: string;
  onMenuPress?: () => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onDatePress?: () => void;
  onAddPress?: () => void;
}

export function DayBar({ dateLabel, doneLabel, onMenuPress, onPrevDay, onNextDay, onDatePress, onAddPress }: DayBarProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  return (
    <FloatingBar
      onMenuPress={onMenuPress}
      onAddPress={onAddPress}
      centerStyle={{ marginHorizontal: 0 }}
      center={
        <Pressable
          onPress={onDatePress}
          style={[styles.pager, { backgroundColor: palette.pillSolid }]}
          accessibilityRole="button"
          accessibilityLabel={dateLabel}
        >
          <Pressable
            onPress={onPrevDay}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('a11yPreviousDay')}
          >
            <Icon name="chevron-left" size={18} color={palette.textDim} />
          </Pressable>
          <View style={styles.pagerLabel}>
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: palette.text }}>{dateLabel}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 10, color: palette.textDim }}>{doneLabel}</Text>
          </View>
          <Pressable
            onPress={onNextDay}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('a11yNextDay')}
          >
            <Icon name="chevron-right" size={18} color={palette.textDim} />
          </Pressable>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  pagerLabel: { alignItems: 'center' },
});
