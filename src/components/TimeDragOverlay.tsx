import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTimeDragStore } from '@/store/timeDragStore';
import { clampMinutes, roundToStep } from '@/domain/time';
import { FLOATING_BAR_MARGIN, FLOATING_BAR_HEIGHT, FLOATING_BAR_CONFIRM_ROW_HEIGHT, FLOATING_BAR_ROW_GAP } from './floatingBarGeometry';

const STEP_MINUTES = 15;
const PX_PER_STEP = 10;
const RULER_TICKS = 40;

/**
 * Solo captura el gesto de arrastre (deslizar en cualquier parte de la pantalla)
 * y dibuja el ruler del borde izquierdo. La barra de confirmación vive dentro de
 * `FloatingBar` (se estira hacia arriba) — por eso este overlay deja un hueco
 * abajo del tamaño de esa barra expandida, para que sus botones reciban el toque
 * en vez de que este overlay de pantalla completa se lo quede.
 */
export function TimeDragOverlay() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const active = useTimeDragStore((s) => s.active);
  const initialMinutes = useTimeDragStore((s) => s.initialMinutes);
  const setCurrentMinutes = useTimeDragStore((s) => s.setCurrentMinutes);

  const baseline = roundToStep(initialMinutes, STEP_MINUTES);

  const updateFromTranslation = (translationY: number) => {
    const deltaSteps = Math.round(translationY / PX_PER_STEP);
    setCurrentMinutes(clampMinutes(baseline + deltaSteps * STEP_MINUTES));
  };

  const pan = Gesture.Pan().onUpdate((e) => {
    runOnJS(updateFromTranslation)(e.translationY);
  });

  if (!active) return null;

  const floatingBarBottom = Math.max(insets.bottom, FLOATING_BAR_MARGIN);
  const reservedBottom =
    floatingBarBottom + FLOATING_BAR_HEIGHT + FLOATING_BAR_ROW_GAP + FLOATING_BAR_CONFIRM_ROW_HEIGHT;

  return (
    <GestureDetector gesture={pan}>
      <View style={[StyleSheet.absoluteFill, { bottom: reservedBottom }]}>
        <TimeRuler color={palette.textDim} top={insets.top + 12} bottom={0} />
      </View>
    </GestureDetector>
  );
}

function TimeRuler({ color, top, bottom }: { color: string; top: number; bottom: number }) {
  return (
    <View pointerEvents="none" style={[styles.ruler, { top, bottom }]}>
      {Array.from({ length: RULER_TICKS }).map((_, i) => (
        <View key={i} style={[styles.rulerTick, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ruler: {
    position: 'absolute',
    left: 6,
    width: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rulerTick: { width: 8, height: 2, borderRadius: 1, opacity: 0.45 },
});
