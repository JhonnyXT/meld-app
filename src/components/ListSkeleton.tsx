import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Maquetación en gris ("skeleton") de una lista mientras carga — evita el
 * parpadeo del estado vacío antes de que lleguen los datos reales. Pulsa la
 * opacidad para dar a entender que algo se está cargando. Llena toda el área
 * visible (no un número fijo de filas, que daría a entender "hay justo N
 * ítems").
 *
 * - `variant="rows"` (default): filas tipo Today/Inbox/agenda de Calendario
 *   (marca de hora + tarjeta con círculo + barra de título).
 * - `variant="tiles"`: bloques altos tipo Momentos (etiqueta + tarjeta de
 *   foto).
 */
const ROW_BAR_WIDTHS = ['68%', '52%', '80%', '44%', '63%', '74%', '58%', '72%'] as const;
const ROW_H = 80;
const TILE_H = 200;

interface ListSkeletonProps {
  variant?: 'rows' | 'tiles';
  /** Forzar una cantidad fija; por defecto se calcula para llenar la pantalla. */
  count?: number;
}

export function ListSkeleton({ variant = 'rows', count }: ListSkeletonProps) {
  const { palette } = useTheme();
  const { height } = useWindowDimensions();
  const unit = variant === 'tiles' ? TILE_H : ROW_H;
  // Header + barra flotante + colchón; +2 para rebasar el borde inferior.
  const n = count ?? Math.max(variant === 'tiles' ? 4 : 8, Math.ceil((height - 240) / unit) + 2);

  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.55, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View style={[variant === 'tiles' ? styles.tilesWrap : styles.rowsWrap, pulseStyle]} pointerEvents="none">
      {Array.from({ length: n }).map((_, i) =>
        variant === 'tiles' ? (
          <View key={i} style={styles.tileBlock}>
            <View style={[styles.tileLabel, { backgroundColor: palette.surfaceHigh }]} />
            <View style={[styles.tileCard, { backgroundColor: palette.surfaceLow }]} />
          </View>
        ) : (
          <View key={i} style={styles.row}>
            <View style={[styles.timeStub, { backgroundColor: palette.surfaceHigh }]} />
            <View style={[styles.card, { backgroundColor: palette.surfaceLow }]}>
              <View style={[styles.circle, { backgroundColor: palette.surfaceHigh }]} />
              <View
                style={[
                  styles.bar,
                  { backgroundColor: palette.surfaceHigh, width: ROW_BAR_WIDTHS[i % ROW_BAR_WIDTHS.length] },
                ]}
              />
            </View>
          </View>
        ),
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rowsWrap: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 68 },
  timeStub: { width: 22, height: 34, borderRadius: 6 },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 60,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  circle: { width: 28, height: 28, borderRadius: 14 },
  bar: { height: 12, borderRadius: 6 },

  tilesWrap: { gap: 20 },
  tileBlock: { gap: 10 },
  tileLabel: { width: 120, height: 12, borderRadius: 6 },
  tileCard: { height: 160, borderRadius: 18 },
});
