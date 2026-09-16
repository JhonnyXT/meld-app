import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ONB } from '../onboardingTheme';

const LOGO = require('../../../../assets/logo.png');
const GLOW_SIZE = 300;

interface WelcomeSlideProps {
  active: boolean;
  title: string;
  subtitle: string;
}

export function WelcomeSlide({ active, title, subtitle }: WelcomeSlideProps) {
  const bounce = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    bounce.value = 0;
    bounce.value = withDelay(
      120,
      withSequence(
        withTiming(1, { duration: 340, easing: Easing.out(Easing.back(1.6)) }),
        withTiming(0.85, { duration: 220, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.4, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [active, bounce, glow]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + bounce.value * 0.12 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + glow.value * 0.45,
    transform: [{ scale: 0.9 + glow.value * 0.18 }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.logoBlock}>
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none">
          <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
            <Defs>
              <RadialGradient id="onbWelcomeGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={ONB.accent} stopOpacity={0.5} />
                <Stop offset="45%" stopColor={ONB.accent} stopOpacity={0.18} />
                <Stop offset="100%" stopColor={ONB.accent} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#onbWelcomeGlow)" />
          </Svg>
        </Animated.View>
        <Animated.View style={logoStyle}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </Animated.View>
      </View>

      {active ? (
        <Animated.Text entering={FadeInDown.delay(220).duration(420)} style={styles.wordmark}>
          Meld
        </Animated.Text>
      ) : (
        <Text style={styles.wordmark}>Meld</Text>
      )}

      {active ? (
        <Animated.Text entering={FadeInDown.delay(340).duration(420)} style={styles.title}>
          {title}
        </Animated.Text>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}

      {active ? (
        <Animated.Text entering={FadeInDown.delay(440).duration(420)} style={styles.subtitle}>
          {subtitle}
        </Animated.Text>
      ) : (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  logoBlock: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 116, height: 116 },
  wordmark: {
    fontFamily: ONB.font.extrabold,
    fontSize: 30,
    color: ONB.textDark,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: ONB.font.bold,
    fontSize: 26,
    lineHeight: 30,
    color: ONB.textDark,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: ONB.font.medium,
    fontSize: 15,
    lineHeight: 21,
    color: ONB.textMedium,
    textAlign: 'center',
    maxWidth: 300,
  },
});
