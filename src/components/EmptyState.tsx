import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import type { IconName } from '@/domain/iconNames';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
}

/** Estado vacío compartido para pantallas de lista (Today, Inbox, búsqueda…):
 * ícono flotante con animación sutil de vaivén + título + mensaje contextual
 * (invita a usar "+" o guardar en la Bandeja). Inspirado en el patrón de
 * `habit-tracker` (`core/ui/empty-state.tsx`), simplificado al sistema visual
 * de Trove (tokens de `theme/tokens.ts`, `Icon` de Lucide). */
export function EmptyState({ icon, title, message }: EmptyStateProps) {
  const { palette, font } = useTheme();
  const reducedMotion = useReducedMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    float.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [reducedMotion, float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -float.value * 8 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.wrap}>
      <Animated.View style={[styles.iconWell, { backgroundColor: palette.surfaceLow }, floatStyle]}>
        <Icon name={icon} size={28} color={palette.textDim} />
      </Animated.View>
      <Text style={[styles.title, { fontFamily: font.semibold, color: palette.text }]}>{title}</Text>
      <Text style={[styles.message, { fontFamily: font.regular, color: palette.textDim }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 6 },
  iconWell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 16, textAlign: 'center' },
  message: { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
});
