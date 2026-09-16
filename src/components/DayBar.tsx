import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { FloatingBar } from './FloatingBar';
import { FLOATING_BAR_CONFIRM_ROW_HEIGHT } from './floatingBarGeometry';

interface DayBarProps {
  dateLabel: string;
  doneLabel: string;
  /** Si el día mostrado no es hoy, `FloatingBar` se estira hacia arriba con
   * una fila "Volver a hoy" (mismo patrón que Undo/confirmar hora) en vez de
   * flotar una pill aparte. */
  isToday?: boolean;
  onMenuPress?: () => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  /** Tocar el pill (fuera de las flechas) — abre el calendario de mes para
   * saltar a cualquier día (pedido explícito del usuario, 2026-09-11; antes
   * saltaba directo a hoy, ver `onBackToToday` para ese atajo). */
  onDatePress?: () => void;
  /** "Volver a hoy" — fila que aparece arriba de la barra cuando el día
   * mostrado no es el actual. */
  onBackToToday?: () => void;
  onAddPress?: () => void;
}

export function DayBar({
  dateLabel,
  doneLabel,
  isToday = true,
  onMenuPress,
  onPrevDay,
  onNextDay,
  onDatePress,
  onBackToToday,
  onAddPress,
}: DayBarProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  // Deslizar el pill de fecha cambia de día (izquierda = día siguiente,
  // derecha = día anterior), además de los chevrons — mismo umbral chico que
  // el resto de gestos horizontales dedicados (no compite con nada más acá,
  // a diferencia del swipe de pantalla completa de Calendar). `runOnJS`
  // porque el gesto corre en el hilo de UI y `onPrevDay`/`onNextDay` son
  // callbacks JS comunes.
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX < -16 || e.velocityX < -400) {
        if (onNextDay) runOnJS(onNextDay)();
      } else if (e.translationX > 16 || e.velocityX > 400) {
        if (onPrevDay) runOnJS(onPrevDay)();
      }
    });

  return (
    <FloatingBar
      onMenuPress={onMenuPress}
      onAddPress={onAddPress}
      centerStyle={{ marginHorizontal: 0 }}
      topRow={!isToday ? <BackToTodayRow onPress={onBackToToday} /> : undefined}
      center={
        <GestureDetector gesture={swipeGesture}>
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
        </GestureDetector>
      }
    />
  );
}

/** Fila interna de "Volver a hoy" — mismo patrón visual que `TimeConfirmRow`/
 * `UndoRow` de `FloatingBar` (altura `FLOATING_BAR_CONFIRM_ROW_HEIGHT`,
 * misma card, sin pill flotante aparte). */
function BackToTodayRow({ onPress }: { onPress?: () => void }) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.backToTodayRow}>
      <Text style={{ fontFamily: font.medium, fontSize: 14, color: palette.textDim, flex: 1 }}>
        {t('backToTodayLabel')}
      </Text>
      <Pressable onPress={onPress} style={[styles.backToTodayBtn, { backgroundColor: palette.accent }]}>
        <Text style={{ fontFamily: font.bold, fontSize: 14, color: '#fff' }}>{t('backToTodayCta')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  pagerLabel: { alignItems: 'center' },
  backToTodayRow: {
    height: FLOATING_BAR_CONFIRM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  backToTodayBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
