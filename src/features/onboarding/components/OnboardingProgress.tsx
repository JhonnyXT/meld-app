import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { ONB } from '../onboardingTheme';

interface OnboardingProgressProps {
  count: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
}

/**
 * Barra de progreso segmentada estilo "stories": un segmento por slide, todos
 * del mismo ancho repartidos en el espacio disponible (por eso los segmentos
 * son más largos cuantas menos slides haya). Los pasados quedan llenos, el
 * actual se rellena de izquierda a derecha siguiendo el scroll en vivo, los
 * futuros quedan vacíos.
 */
export function OnboardingProgress({ count, scrollX, pageWidth }: OnboardingProgressProps) {
  return (
    <View style={styles.row} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <Segment key={i} index={i} scrollX={scrollX} pageWidth={pageWidth} />
      ))}
    </View>
  );
}

function Segment({
  index,
  scrollX,
  pageWidth,
}: {
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
}) {
  const fillStyle = useAnimatedStyle(() => {
    const start = (index - 1) * pageWidth;
    const end = index * pageWidth;
    const pct = interpolate(scrollX.value, [start, end], [0, 1], Extrapolation.CLAMP);
    return { width: `${pct * 100}%` };
  });
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center', flex: 1 },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: ONB.dotInactive,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: ONB.accent },
});
