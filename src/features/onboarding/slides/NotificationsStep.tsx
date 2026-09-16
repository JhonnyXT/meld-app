import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon } from '@/components/Icon';
import { useTranslation } from '@/i18n';
import { ONB } from '../onboardingTheme';

interface NotificationsStepProps {
  onBack: () => void;
  onEnable: () => void;
  onSkip: () => void;
}

export function NotificationsStep({ onBack, onEnable, onSkip }: NotificationsStepProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
    );
  }, [pulse]);

  const ring0 = useAnimatedStyle(() => {
    const v = Math.max(0, Math.min(1, pulse.value));
    return { opacity: 0.4 * (1 - v), transform: [{ scale: 0.6 + v * 1.6 }] };
  });
  const ring1 = useAnimatedStyle(() => {
    const v = Math.max(0, Math.min(1, pulse.value - 0.33));
    return { opacity: 0.4 * (1 - v), transform: [{ scale: 0.6 + v * 1.6 }] };
  });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('onbBack')}
        >
          <Icon name="chevron-left" size={24} color={ONB.textDark} />
        </Pressable>
        <View style={styles.body}>
          <View style={styles.bellWrap}>
            <Animated.View style={[styles.ring, ring0]} pointerEvents="none" />
            <Animated.View style={[styles.ring, ring1]} pointerEvents="none" />
            <View style={styles.bell}>
              <Icon name="notifications" size={34} color="#FFFFFF" />
            </View>
          </View>

          <Animated.Text entering={FadeInDown.delay(120).duration(420)} style={styles.title}>
            {t('onbNotifTitle')}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(220).duration(420)} style={styles.subtitle}>
            {t('onbNotifSubtitle')}
          </Animated.Text>
        </View>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <Pressable style={styles.primary} onPress={onEnable}>
            <Text style={styles.primaryText}>{t('onbNotifEnable')}</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={onSkip} hitSlop={8}>
            <Text style={styles.ghostText}>{t('onbNotifSkip')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ONB.bg },
  safe: { flex: 1 },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    marginTop: 30,
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  bellWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: ONB.accent,
  },
  bell: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: ONB.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ONB.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
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
    lineHeight: 22,
    color: ONB.textMedium,
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: { paddingHorizontal: 24, gap: 4 },
  primary: {
    height: 56,
    borderRadius: 18,
    backgroundColor: ONB.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: ONB.font.semibold, fontSize: 17, color: '#FFFFFF' },
  ghost: { height: 44, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontFamily: ONB.font.semibold, fontSize: 15, color: ONB.textMedium },
});
