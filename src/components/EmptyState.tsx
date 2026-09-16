import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
  ctaLabel?: string;
  onPressCta?: () => void;
}

/** Estado vacío compartido para pantallas de lista (Today, Inbox, búsqueda…):
 * ícono flotante con animación sutil de vaivén + título + mensaje contextual
 * (invita a usar "+" o guardar en la Bandeja). Inspirado en el patrón de
 * `habit-tracker` (`core/ui/empty-state.tsx`), simplificado al sistema visual
 * de Meld (tokens de `theme/tokens.ts`, `Icon` de Lucide). `ctaLabel`/
 * `onPressCta` (opcionales) agregan el botón "+ Add a task" del diseño Pen
 * "Empty State / No Tasks Today" — hoy solo lo usa Today, Inbox sigue sin
 * botón (su propio campo de captura rápida ya cumple ese rol). */
export function EmptyState({ icon, title, message, ctaLabel, onPressCta }: EmptyStateProps) {
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
      <Text style={[styles.title, { fontFamily: font.bold, color: palette.text }]}>{title}</Text>
      <Text style={[styles.message, { fontFamily: font.regular, color: palette.textDim }]}>{message}</Text>
      {ctaLabel && onPressCta ? (
        <Pressable
          onPress={onPressCta}
          style={({ pressed }) => [styles.cta, { backgroundColor: palette.text, opacity: pressed ? 0.85 : 1 }]}
        >
          <Icon name="add" size={16} color={palette.bg} />
          <Text style={[styles.ctaLabel, { fontFamily: font.bold, color: palette.bg }]}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
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
  title: { fontSize: 18, textAlign: 'center' },
  message: { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 22,
    marginTop: 14,
  },
  ctaLabel: { fontSize: 14.5 },
});
