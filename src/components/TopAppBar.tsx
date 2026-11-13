import React from 'react';
import { Text, Pressable } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useSearchStore } from '@/store/searchStore';

interface TopAppBarProps {
  title: string;
  subtitle: string;
  onMorePress?: () => void;
  grouped?: boolean;
  onToggleGroup?: () => void;
}

export function TopAppBar({ title, subtitle, onMorePress, grouped, onToggleGroup }: TopAppBarProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const open = useSearchStore((s) => s.open);

  return (
    <ScreenHeader
      title={
        <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 46, letterSpacing: -1, color: palette.text }}>
          {title}
        </Text>
      }
      subtitle={
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: palette.textDim }}>{subtitle}</Text>
      }
      right={
        <>
          <Pressable onPress={open} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('a11ySearch')}>
            <Icon name="search" size={24} color={palette.textDim} />
          </Pressable>
          {onToggleGroup ? (
            <Pressable
              onPress={onToggleGroup}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ selected: !!grouped }}
              accessibilityLabel={t('a11yGroupByType')}
            >
              <Icon name="filter-list" size={24} color={grouped ? palette.accent : palette.textDim} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onMorePress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('remindersTitle')}
          >
            <Icon name="more-horiz" size={24} color={palette.textDim} />
          </Pressable>
        </>
      }
    />
  );
}
