import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

export type AuraVariant = 'nightfall' | 'abyssal-floor';

/**
 * Fondo de Today — aproximación liviana de un fondo con capas de gradiente +
 * blend modes CSS (screen/soft-light) sobre fondo oscuro. RN no tiene
 * `mix-blend-mode` nativo, así que esto NO es un blend real, es una
 * composición por capas semi-transparentes que se acerca visualmente al
 * original (specs "Aura Gradient"). Para fidelidad real (blend modes reales
 * + shader de ruido/grano) haría falta `@shopify/react-native-skia` (no
 * instalado — dependencia nativa pesada, evaluado y descartado). El grano se
 * dejó afuera por el mismo motivo.
 *
 * **Solo modo oscuro** — a pedido explícito del usuario, `TodayScreen.tsx`
 * únicamente pasa la prop `background` de `Screen` cuando
 * `useTheme().scheme === 'dark'`; en claro, Today usa el `palette.bg` blanco
 * plano de siempre, sin degradado. Por eso este componente ya no lee el
 * tema — antes tenía una rama clara/oscura con opacidades adaptadas, se
 * sacó porque nunca se monta en claro.
 *
 * **"Abyssal Floor" es la activa en `TodayScreen.tsx` hoy** (`variant`
 * default). "Nightfall" quedó guardada a pedido explícito del usuario — le
 * gustaron varias — disponible pasándole `variant="nightfall"` a
 * `<AuraBackground>`, no borrarla. Se probaron y descartaron del todo otras
 * 5 variantes en vivo en Today (Aurora Beams, Smoke, Carbon Glass, Phantom
 * Arc, Dew) — no reintroducirlas sin que las vuelvan a pedir explícitamente.
 *
 * Ojo con el timing en dispositivo real: en el Moto E7 Plus un bundle de
 * Metro en frío (`--clear`, 4000+ módulos) tarda 15-25s en bajar+ejecutar+
 * pintar — una pantalla gris/negra sólida en los primeros segundos después
 * de relanzar NO es un bug, es la carga todavía en curso (falso positivo
 * real ya investigado, no asumir que algo se rompió sin esperar al menos
 * 30s desde el "Running main" del log de Metro).
 */
export function AuraBackground({ variant = 'abyssal-floor', children }: { variant?: AuraVariant; children?: React.ReactNode }) {
  if (variant === 'nightfall') return <NightfallBackground>{children}</NightfallBackground>;
  return <AbyssalFloorBackground>{children}</AbyssalFloorBackground>;
}

function NightfallBackground({ children }: { children?: React.ReactNode }) {
  return (
    <View style={[styles.root, { backgroundColor: '#100e0b' }]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="nightTop" cx="52%" cy="0%" r="70%">
            <Stop offset="0%" stopColor="rgb(35,70,105)" stopOpacity={0.4} />
            <Stop offset="38%" stopColor="rgb(24,49,74)" stopOpacity={0.22} />
            <Stop offset="76%" stopColor="rgb(24,49,74)" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="nightCorner" cx="78%" cy="16%" r="40%">
            <Stop offset="0%" stopColor="rgb(96,130,155)" stopOpacity={0.22} />
            <Stop offset="78%" stopColor="rgb(96,130,155)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#nightTop)" />
        <Rect width="100%" height="100%" fill="url(#nightCorner)" />
      </Svg>

      {/* Lavado vertical tenue arriba→abajo (aproxima "soft-light") */}
      <LinearGradient
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        colors={['rgba(54,88,120,0.14)', 'transparent', 'rgba(0,0,0,0.16)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

/**
 * "Abyssal Floor": glow teal/cian asomando desde ABAJO (radial centrado por
 * debajo del borde inferior, `cy` > 100%, aproxima "screen" + blur grande) +
 * un segundo lavado lineal más angosto de abajo hacia arriba (aproxima
 * "screen" + blur chico) — el efecto contrario a Nightfall (que viene de
 * arriba).
 */
function AbyssalFloorBackground({ children }: { children?: React.ReactNode }) {
  return (
    <View style={[styles.root, { backgroundColor: '#100e0b' }]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="abyssGlow" cx="50%" cy="115%" r="85%">
            <Stop offset="0%" stopColor="rgb(0,90,110)" stopOpacity={0.55} />
            <Stop offset="40%" stopColor="rgb(0,45,60)" stopOpacity={0.32} />
            <Stop offset="75%" stopColor="rgb(0,45,60)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#abyssGlow)" />
      </Svg>

      {/* Lavado lineal desde abajo (aproxima "screen" + blur 50px) */}
      <LinearGradient
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        colors={['transparent', 'rgba(0,130,150,0.22)']}
        locations={[0.65, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative', overflow: 'hidden' },
  content: { flex: 1, position: 'relative', zIndex: 1 },
});
