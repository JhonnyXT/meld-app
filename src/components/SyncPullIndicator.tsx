/**
 * SyncPullIndicator — el indicador de "trayendo cambios" de Today (SYNC_ROADMAP.md, Fase 3).
 * Mismo diseño que `my-wallet-app` (`src/components/dashboard/SyncPullIndicator.tsx`):
 * - jalando: un anillo se llena con el recorrido y la flecha gira; lleno = al soltar, sincroniza;
 * - sincronizando: un arco gira como spinner;
 * - listo: un ✓ breve antes de que el contenido vuelva a subir;
 * - sin conexión: una nube tachada (la sync sigue sola en segundo plano).
 *
 * Todo con Reanimated (hilo de UI) — ver `src/features/today/TodayScreen.tsx` para el gesto.
 */
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { ArrowDown, Check, CloudOff } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

export type SyncPullPhase = 'idle' | 'pulling' | 'refreshing' | 'done' | 'offline';

export interface SyncPullIndicatorProps {
  /** Cuánto bajó el contenido, px. */
  offset: SharedValue<number>;
  /** 0 → 1 hasta el punto en que soltar sincroniza. */
  progress: SharedValue<number>;
  phase: SyncPullPhase;
  /** Altura del hueco cuando el contenido se queda abajo sincronizando. */
  holdOffset: number;
  reducedMotion: boolean;
}

export const SYNC_INDICATOR_SIZE = 40;
const STROKE = 2.5;
const RADIUS = (SYNC_INDICATOR_SIZE - 8) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SPINNER_ARC = CIRCUMFERENCE * 0.28;
/** Sin token "warning" en `theme/tokens.ts` — mismo ámbar que `STREAK_COLOR` de `DayItemRow`. */
const WARNING_COLOR = '#F59E0B';
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

export function SyncPullIndicator({ offset, progress, phase, holdOffset, reducedMotion }: SyncPullIndicatorProps) {
  const { palette } = useTheme();
  const accent = palette.accent;
  const spin = useSharedValue(0);
  const pop = useSharedValue(1);
  const iconScale = useSharedValue(0);
  const spinning = useSharedValue(0);

  useEffect(() => {
    spinning.value = phase === 'refreshing' ? 1 : 0;
    // Sincronizando: el arco gira sin parar (no con "reducir movimiento").
    if (phase === 'refreshing' && !reducedMotion) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.linear }), -1);
      pop.value = withSequence(withTiming(1.15, { duration: 90 }), withSpring(1, { damping: 9, stiffness: 260 }));
    } else {
      cancelAnimation(spin);
      spin.value = 0;
    }
    // Listo / sin conexión: el ícono entra con resorte.
    if (phase === 'done' || phase === 'offline') {
      iconScale.value = reducedMotion ? 1 : withSpring(1, { damping: 10, stiffness: 280 });
    } else {
      iconScale.value = 0.4;
    }
  }, [phase, reducedMotion, spin, pop, iconScale, spinning]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, 18], [0, 1], Extrapolation.CLAMP),
    transform: [
      // Centrado en el hueco que deja el contenido al bajar.
      {
        translateY: interpolate(
          offset.value,
          [0, holdOffset * 2],
          [-SYNC_INDICATOR_SIZE / 2, holdOffset - SYNC_INDICATOR_SIZE / 2],
          Extrapolation.CLAMP,
        ),
      },
      { scale: interpolate(offset.value, [0, holdOffset * 0.7], [0.4, 1], Extrapolation.CLAMP) },
    ],
  }));
  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  // Jalando: el anillo se llena con el recorrido. Sincronizando: un arco corto que gira.
  const arcProps = useAnimatedProps(() =>
    spinning.value
      ? { strokeDasharray: [SPINNER_ARC, CIRCUMFERENCE], strokeDashoffset: 0 }
      : {
          strokeDasharray: [CIRCUMFERENCE, CIRCUMFERENCE],
          strokeDashoffset: CIRCUMFERENCE * (1 - Math.min(Math.max(progress.value, 0), 1)),
        },
  );
  // La flecha gira media vuelta al final del recorrido: apunta arriba = soltar trae.
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0.6, 1], [0, 180], Extrapolation.CLAMP)}deg` }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  if (phase === 'idle') return null;

  const showRing = phase === 'pulling' || phase === 'refreshing';

  return (
    <Reanimated.View pointerEvents="none" style={[styles.wrap, wrapStyle]}>
      <Reanimated.View style={[styles.circle, { backgroundColor: palette.surfaceHigh }, circleStyle]}>
        <Reanimated.View style={[StyleSheet.absoluteFill, ringStyle]}>
          <Svg width={SYNC_INDICATOR_SIZE} height={SYNC_INDICATOR_SIZE}>
            <Circle
              cx={SYNC_INDICATOR_SIZE / 2}
              cy={SYNC_INDICATOR_SIZE / 2}
              r={RADIUS}
              stroke={palette.border}
              strokeWidth={STROKE}
              fill="none"
            />
            {showRing && (
              <AnimatedCircle
                cx={SYNC_INDICATOR_SIZE / 2}
                cy={SYNC_INDICATOR_SIZE / 2}
                r={RADIUS}
                stroke={accent}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                animatedProps={arcProps}
                // Empieza arriba (las 12), no a la derecha.
                rotation={-90}
                origin={`${SYNC_INDICATOR_SIZE / 2}, ${SYNC_INDICATOR_SIZE / 2}`}
              />
            )}
          </Svg>
        </Reanimated.View>

        {phase === 'pulling' && (
          <Reanimated.View style={arrowStyle}>
            <ArrowDown size={16} color={accent} strokeWidth={2.6} />
          </Reanimated.View>
        )}
        {(phase === 'done' || phase === 'offline') && (
          <Reanimated.View style={iconStyle}>
            {phase === 'done' ? (
              <Check size={18} color={palette.success} strokeWidth={2.8} />
            ) : (
              <CloudOff size={17} color={WARNING_COLOR} strokeWidth={2.4} />
            )}
          </Reanimated.View>
        )}
      </Reanimated.View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  circle: {
    width: SYNC_INDICATOR_SIZE,
    height: SYNC_INDICATOR_SIZE,
    borderRadius: SYNC_INDICATOR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
