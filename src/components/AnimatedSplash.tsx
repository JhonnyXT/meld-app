import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from '@/i18n';

const HOLD_END = 1150;
const FADE_OUT_DURATION = 200;
const EXPAND_DURATION = 620;
const GLOW_SIZE = 260;
const EXPAND_SCALE_TARGET = 5; // 260 * 5 = 1300px, cubre la diagonal de cualquier teléfono
const ICON_SIZE = 160;

/**
 * Splash animado propio, mostrado apenas monta React — reemplaza al splash
 * nativo estático (`app.config.ts` → plugin `expo-splash-screen`, mismo
 * logo/fondo) que ya se ocultó en `_layout.tsx` justo antes de renderizar
 * esto, así no hay un frame en blanco entre los dos. Ver CLAUDE.md → "Logo y
 * splash screen" para el porqué de este patrón (Expo no anima el splash
 * nativo por sí solo).
 *
 * Coreografía (pedido explícito del usuario, 2026-08-21, con referencia
 * visual propia — ícono apareciendo + el glow rojo alrededor "explotando"
 * para cubrir toda la pantalla y revelar Today, no un simple fundido):
 * 1) Entrada: el ÍCONO ARRANCA YA VISIBLE (`logoOpacity` fijo en 1, nunca
 *    anima) — solo tiene un rebote sutil de escala (1 → 1.08 → 1). Dos bugs
 *    reales corregidos acá, ambos reportados en dispositivo real:
 *    a) Opacidad: la primera versión hacía fundido 0→1 en el ícono, y esa
 *       fracción de segundo en la que el ícono nuevo (React) se solapaba
 *       semitransparente sobre el splash NATIVO estático (mismo ícono, ver
 *       `app.config.ts` → plugin `expo-splash-screen`) se veía como "dos
 *       íconos" superpuestos. Con opacidad fija en 1 nunca hay un instante
 *       en que ambos sean parcialmente transparentes a la vez.
 *    b) Posición: `iconWrap` NO puede ser un hijo más del `flex` vertical
 *       centrado junto con el wordmark/lema — aunque esos textos arranquen
 *       en opacity 0, siguen ocupando espacio real en el layout, así que el
 *       `justifyContent:'center'` del contenedor empuja al ícono hacia
 *       arriba para dejarles lugar debajo. El splash NATIVO centra el ícono
 *       en TODA la pantalla, sin nada más — ese desfase de posición (el
 *       ícono "sube" apenas monta React) se leía como si apareciera un
 *       segundo ícono en otro lugar. Fix: `iconWrap` y el bloque de texto
 *       son dos elementos `position:absolute` independientes, anclados los
 *       dos al centro real de la pantalla por separado — el ícono nunca se
 *       mueve un píxel al aparecer el texto.
 *    El glow ambiental sí puede fundirse desde 0 sin problema (no existe
 *    versión nativa de él, no hay nada con qué solaparse) pulsando detrás
 *    (`RadialGradient` real, no un disco plano — mismo patrón que
 *    `AuraBackground.tsx`), wordmark "Trove" y lema en cascada.
 * 2) Hold breve con todo visible.
 * 3) Expansión: el MISMO nodo del glow (no uno nuevo/duplicado — así el
 *    color es exactamente igual al que rodea el ícono, no una aproximación)
 *    crece con `Easing.in` hasta cubrir toda la pantalla mientras ícono/
 *    wordmark/lema se apagan rápido. Al ser un `RadialGradient` que se
 *    desvanece a transparente (no un color plano), incluso a tamaño
 *    completo la pantalla no queda pareja — el centro se ve más saturado y
 *    se difumina hacia los bordes, igual que el glow chico, solo que
 *    ocupando todo. Apenas termina de crecer, dispara `onFinish` — el corte
 *    a Today es la transición en sí, a propósito.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();

  const logoOpacity = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.9);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkY = useSharedValue(10);
  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(8);

  useEffect(() => {
    // Opacidad SIEMPRE en 1 durante la entrada — recién baja a 0 en la
    // salida (ver arriba, por qué no puede animarse desde 0 al montar).
    logoOpacity.value = withDelay(
      HOLD_END,
      withTiming(0, { duration: FADE_OUT_DURATION, easing: Easing.in(Easing.quad) }),
    );
    // Rebote sutil de escala como única señal de "aparición" del ícono.
    logoScale.value = withDelay(
      80,
      withSequence(
        withTiming(1.08, { duration: 340, easing: Easing.out(Easing.back(1.4)) }),
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.quad) }),
      ),
    );

    glowOpacity.value = withDelay(180, withTiming(0.9, { duration: 420, easing: Easing.out(Easing.quad) }));
    glowScale.value = withSequence(
      withDelay(180, withTiming(1.15, { duration: 700, easing: Easing.out(Easing.quad) })),
      withDelay(
        HOLD_END - 880,
        withTiming(EXPAND_SCALE_TARGET, { duration: EXPAND_DURATION, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(onFinish)();
        }),
      ),
    );

    wordmarkOpacity.value = withDelay(
      420,
      withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
        withDelay(HOLD_END - 720, withTiming(0, { duration: FADE_OUT_DURATION, easing: Easing.in(Easing.quad) })),
      ),
    );
    wordmarkY.value = withDelay(420, withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) }));

    taglineOpacity.value = withDelay(
      560,
      withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
        withDelay(HOLD_END - 860, withTiming(0, { duration: FADE_OUT_DURATION, easing: Easing.in(Easing.quad) })),
      ),
    );
    taglineY.value = withDelay(560, withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Anclado al centro real de la pantalla, independiente del bloque de
          texto de abajo — nunca se mueve al aparecer/desaparecer el texto. */}
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.glowWrap, glowStyle]}>
          <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
            <Defs>
              <RadialGradient id="splashGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FF4B66" stopOpacity={0.5} />
                <Stop offset="45%" stopColor="#FF4B66" stopOpacity={0.18} />
                <Stop offset="100%" stopColor="#FF4B66" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#splashGlow)" />
          </Svg>
        </Animated.View>
        <Animated.Image
          source={require('../../assets/splash-icon.png')}
          style={[styles.logo, logoStyle]}
          resizeMode="contain"
        />
      </View>
      <View style={styles.textBlock}>
        <Animated.Text style={[styles.wordmark, wordmarkStyle]}>Trove</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>{t('appTagline')}</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  iconWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -ICON_SIZE / 2,
    marginTop: -ICON_SIZE / 2,
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrap: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    left: (ICON_SIZE - GLOW_SIZE) / 2,
    top: (ICON_SIZE - GLOW_SIZE) / 2,
  },
  logo: { width: ICON_SIZE, height: ICON_SIZE },
  textBlock: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: ICON_SIZE / 2 + 28,
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.4,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  tagline: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
    color: '#8E8E93',
    textAlign: 'center',
    width: 230,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
});
