import { useEffect, useState } from 'react';
import { Image, type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { ONB } from '../onboardingTheme';
import type { MockSlide } from '../onboardingSlides';

interface PhoneMockProps {
  slide: MockSlide;
  /** true cuando esta slide es la que está centrada en pantalla. */
  active: boolean;
}

/**
 * Mockup enmarcado (PNG de shots.so, ya recortado al bbox alfa) que sangra por
 * detrás del botón inferior. `wide` = recorte ancho, llena a lo ancho y se
 * recorta un poco de los lados (`overflow:hidden`); `portrait` = dispositivo
 * completo, entra a lo ancho sin recorte. Encima flota un acento animado que
 * resalta la feature (posición aproximada, se lee como un realce de UI).
 */
export function PhoneMock({ slide, active }: PhoneMockProps) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const float = useSharedValue(0);
  const enter = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((prev) =>
      prev && prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [float]);

  useEffect(() => {
    enter.value = active
      ? withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })
      : withTiming(0, { duration: 220 });
  }, [active, enter]);

  // Mismo tamaño que el mockup del onboarding anterior (v1): `wide` sangra
  // fuerte por los lados (factor 1.35 del ancho de pantalla, recorte con
  // `overflow:hidden`), anclado abajo, por detrás del botón. `portrait`
  // (dispositivo completo) entra casi a todo el ancho y se limita al alto del
  // hueco si no cabe.
  const portrait = slide.framing === 'portrait';
  let width = 0;
  let height = 0;
  if (box) {
    if (portrait) {
      // Dispositivo completo: entra a lo ancho con un sangrado lateral, anclado
      // ARRIBA (el header "Momentos"/"Agosto" queda visible) y el pie sangra
      // por detrás del botón (recorte con `overflow:hidden`).
      width = box.width * 1.24;
      height = width / slide.ratio;
    } else {
      // Recorte ancho: sangra fuerte por los lados, anclado abajo.
      width = box.width * 1.35;
      height = width / slide.ratio;
    }
  }

  // La opacidad de entrada/salida la maneja el `SlideFrame` del contenedor
  // (parallax con el scroll); acá solo un leve rise + scale al activarse.
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: float.value * 6 + (1 - enter.value) * 22 },
      { scale: 0.95 + enter.value * 0.05 },
    ],
  }));

  return (
    <View
      style={[styles.wrap, { justifyContent: portrait ? 'flex-start' : 'flex-end' }]}
      onLayout={onLayout}
      pointerEvents="none"
    >
      {box ? (
        <Animated.View style={[{ width, height }, imageStyle]}>
          <Image source={slide.mock} style={styles.image} resizeMode="contain" />
          <MockAccent slide={slide} active={active} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function MockAccent({ slide, active }: PhoneMockProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      pulse.value = 0;
      return;
    }
    pulse.value = withDelay(
      420,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
          withTiming(0.6, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
  }, [active, pulse]);

  const scale = slide.accent.scale ?? 1;
  const badge = 40 * scale;
  const ring = 56 * scale;
  const iconSize = Math.round(20 * scale);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.18 * (1 - Math.abs(pulse.value - 0.5) * 1.4),
    transform: [{ scale: 0.7 + pulse.value * 0.7 }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 0.9 + pulse.value * 0.14 }],
  }));

  return (
    <View
      style={[
        styles.accentAnchor,
        {
          // El punto x/y del slide es el CENTRO del acento: se compensa
          // medio badge en cada eje para centrarlo ahí, no anclar su borde.
          left: `${slide.accent.x * 100}%`,
          top: `${slide.accent.y * 100}%`,
          marginLeft: -badge / 2,
          marginTop: -badge / 2,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.accentRing,
          {
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            top: (badge - ring) / 2,
            left: (badge - ring) / 2,
          },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.accentBadge,
          { width: badge, height: badge, borderRadius: badge / 2 },
          badgeStyle,
        ]}
      >
        <Icon name={slide.accent.icon} size={iconSize} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  accentAnchor: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  accentRing: {
    position: 'absolute',
    backgroundColor: ONB.accent,
  },
  accentBadge: {
    backgroundColor: ONB.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ONB.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
