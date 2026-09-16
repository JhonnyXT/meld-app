import { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/i18n';
import { requestNotificationPermission } from '@/services/notifications';
import { useSettingsStore, type PlanTier } from '@/store/settingsStore';
import { Icon } from '@/components/Icon';
import { ONB } from './onboardingTheme';
import { SLIDES } from './onboardingSlides';
import { OnboardingProgress } from './components/OnboardingProgress';
import { PhoneMock } from './components/PhoneMock';
import { WelcomeSlide } from './slides/WelcomeSlide';
import { PlansSlide } from './slides/PlansSlide';
import { NotificationsStep } from './slides/NotificationsStep';

interface OnboardingScreenProps {
  onDone: () => void;
}

const LAST = SLIDES.length - 1;

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);
  const [phase, setPhase] = useState<'slides' | 'notif'>('slides');

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) {
      setPage(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    Haptics.selectionAsync().catch(() => {});
  };

  const toNotif = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPhase('notif');
  };

  const choosePlan = (plan: PlanTier) => {
    useSettingsStore.getState().setPlan(plan);
    toNotif();
  };

  const finish = async (withNotif: boolean) => {
    if (withNotif) {
      try {
        await requestNotificationPermission();
      } catch {
        // permiso denegado / no disponible — se sigue igual
      }
    }
    onDone();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ width: width * SLIDES.length }}
      >
        {SLIDES.map((slide, i) => (
          <SlideFrame key={slide.key} width={width} index={i} scrollX={scrollX}>
            {slide.kind === 'welcome' ? (
              <WelcomeSlide
                active={page === i}
                title={t(slide.titleKey)}
                subtitle={t(slide.subtitleKey)}
              />
            ) : slide.kind === 'mock' ? (
              <SafeAreaView edges={['top']} style={styles.slideInner}>
                <View style={styles.headerArea}>
                  <Text style={styles.title}>{t(slide.titleKey)}</Text>
                  <Text style={styles.subtitle}>{t(slide.subtitleKey)}</Text>
                </View>
                <View style={styles.mockArea}>
                  <PhoneMock slide={slide} active={page === i} />
                </View>
              </SafeAreaView>
            ) : (
              <SafeAreaView edges={['top']} style={styles.slideInner}>
                <View style={styles.plansTopSpacer} />
                <PlansSlide active={page === i} onChoose={choosePlan} />
              </SafeAreaView>
            )}
          </SlideFrame>
        ))}
      </Animated.ScrollView>

      {/* Chrome superior: flecha atrás + barra de progreso segmentada */}
      <SafeAreaView edges={['top']} style={styles.topChrome} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          {page > 0 ? (
            <Pressable
              onPress={() => goTo(page - 1)}
              hitSlop={12}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel={t('onbBack')}
            >
              <Icon name="chevron-left" size={24} color={ONB.textDark} />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
          <OnboardingProgress count={SLIDES.length} scrollX={scrollX} pageWidth={width} />
        </View>
      </SafeAreaView>

      {/* Botón inferior + enlace Saltar — ocultos en Planes (tiene sus propios botones) */}
      {page < LAST ? (
        <View style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <LinearGradient
            colors={[ONB.scrimClear, ONB.bg, ONB.bg]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Pressable onPress={() => goTo(page + 1)} style={styles.nextButton}>
            <Text style={styles.nextText}>
              {page === 0 ? t('onboardingStart') : t('onboardingNext')}
            </Text>
          </Pressable>
          <Pressable onPress={toNotif} hitSlop={10} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>{t('onboardingSkip')}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Paso de Notificaciones — overlay opaco sobre el carrusel (no un
          return aparte: desmontar el pager pierde su offset y, al volver con
          "Atrás", el slide activo quedaba en blanco). */}
      {phase === 'notif' ? (
        <View style={StyleSheet.absoluteFill}>
          <NotificationsStep
            onBack={() => setPhase('slides')}
            onEnable={() => finish(true)}
            onSkip={() => finish(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

function SlideFrame({
  width,
  index,
  scrollX,
  children,
}: {
  width: number;
  index: number;
  scrollX: SharedValue<number>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const dist = Math.abs(scrollX.value - index * width);
    const k = interpolate(dist, [0, width * 0.7], [1, 0], Extrapolation.CLAMP);
    return { opacity: k, transform: [{ translateY: (1 - k) * 14 }] };
  });
  return <Animated.View style={[{ width }, styles.slide, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ONB.bg },
  slide: { flex: 1 },
  slideInner: { flex: 1 },
  plansTopSpacer: { height: 92 },
  // Bloque de texto de las slides con mockup: ocupa el hueco sobre el teléfono
  // y centra el texto verticalmente ahí, para que no quede pegado arriba con
  // un vacío enorme antes del mockup. El `mockArea` se lleva más peso.
  headerArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mockArea: { flex: 1.9 },
  title: {
    fontFamily: ONB.font.bold,
    fontSize: 26,
    lineHeight: 32,
    color: ONB.textDark,
    textAlign: 'center',
    letterSpacing: -0.4,
    maxWidth: 280,
  },
  subtitle: {
    fontFamily: ONB.font.medium,
    fontSize: 15.5,
    lineHeight: 22,
    color: ONB.textMedium,
    textAlign: 'center',
    maxWidth: 280,
  },
  topChrome: { position: 'absolute', left: 0, right: 0, top: 0 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 24,
    marginTop: 30,
    minHeight: 32,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 72,
    alignItems: 'center',
  },
  skipLink: { height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  skipLinkText: { fontFamily: ONB.font.semibold, fontSize: 15, color: ONB.textLight, letterSpacing: -0.1 },
  nextButton: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    backgroundColor: ONB.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { fontFamily: ONB.font.semibold, fontSize: 17, color: '#FFFFFF' },
});
