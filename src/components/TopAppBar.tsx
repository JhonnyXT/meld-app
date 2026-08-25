import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useSearchStore } from '@/store/searchStore';

interface TopAppBarProps {
  title: string;
  subtitle: string;
  inboxCount?: number;
  onHistoryPress?: () => void;
  onInboxPress?: () => void;
}

export function TopAppBar({ title, subtitle, inboxCount = 0, onHistoryPress, onInboxPress }: TopAppBarProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const open = useSearchStore((s) => s.open);

  return (
    <ScreenHeader
      title={
        <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: palette.text }}>
          {title}
        </Text>
      }
      subtitle={
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>{subtitle}</Text>
      }
      right={
        <>
          <Pressable onPress={open} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('a11ySearch')}>
            <Icon name="search" size={24} color={palette.textDim} />
          </Pressable>
          <Pressable
            onPress={onHistoryPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('remindersTitle')}
          >
            <Icon name="schedule" size={24} color={palette.textDim} />
          </Pressable>
          <Pressable
            onPress={onInboxPress}
            hitSlop={8}
            style={{ position: 'relative' }}
            accessibilityRole="button"
            accessibilityLabel={t('a11yOpenInbox')}
          >
            <Icon name="inbox" size={24} color={palette.textDim} />
            {inboxCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: palette.accent, borderColor: palette.bg }]}>
                <Text style={styles.badgeText}>{inboxCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
});
