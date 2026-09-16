import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/domain/iconNames';
import { useTranslation, type TranslationKey } from '@/i18n';
import type { PlanTier } from '@/store/settingsStore';
import { ONB } from '../onboardingTheme';

const LOGO = require('../../../../assets/logo.png');

interface PlansSlideProps {
  active: boolean;
  onChoose: (plan: PlanTier) => void;
}

const FEATURES: { icon: IconName; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: 'favorite', titleKey: 'onbPlanProF1', descKey: 'onbPlanProF1Desc' },
  { icon: 'cloud', titleKey: 'onbPlanProF2', descKey: 'onbPlanProF2Desc' },
  { icon: 'sparkles', titleKey: 'onbPlanProF3', descKey: 'onbPlanProF3Desc' },
  { icon: 'zap', titleKey: 'onbPlanProF4', descKey: 'onbPlanProF4Desc' },
];

export function PlansSlide({ active, onChoose }: PlansSlideProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const Row = active ? Animated.View : View;
  const enter = (delay: number) =>
    active ? { entering: FadeInDown.delay(delay).duration(380) } : {};

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 16) + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Row {...enter(80)} style={styles.iconWrap}>
        <Image source={LOGO} style={styles.icon} resizeMode="contain" />
      </Row>

      <Row {...enter(140)}>
        <Text style={styles.title}>{t('onbPlansTitle')}</Text>
      </Row>
      <Row {...enter(200)}>
        <Text style={styles.subtitle}>{t('onbPlansSubtitle')}</Text>
      </Row>

      <View style={styles.featureList}>
        {FEATURES.map((f, i) => (
          <Row key={f.titleKey} {...enter(280 + i * 70)} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icon name={f.icon} size={20} color={ONB.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t(f.titleKey)}</Text>
              <Text style={styles.featureDesc}>{t(f.descKey)}</Text>
            </View>
          </Row>
        ))}
      </View>

      <Row {...enter(580)}>
        <Pressable style={styles.primary} onPress={() => onChoose('pro')}>
          <Text style={styles.primaryText}>{t('onbPlansTryPro')}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => onChoose('free')}>
          <Text style={styles.secondaryText}>{t('onbPlansContinueFree')}</Text>
        </Pressable>
        <Text style={styles.finePrint}>{t('onbPlansFinePrint')}</Text>
        <View style={styles.footerRow}>
          <Text style={styles.footerLink}>{t('onbPlansRestore')}</Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerLink}>{t('onbPlansLegal')}</Text>
        </View>
      </Row>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, width: '100%' },
  content: { paddingHorizontal: 24, paddingTop: 8, alignItems: 'center' },
  iconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  icon: { width: 78, height: 78 },
  title: {
    fontFamily: ONB.font.extrabold,
    fontSize: 26,
    lineHeight: 30,
    color: ONB.textDark,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: ONB.font.medium,
    fontSize: 15,
    lineHeight: 21,
    color: ONB.textMedium,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 8,
  },
  featureList: { alignSelf: 'stretch', marginTop: 26, gap: 20 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  featureIcon: { width: 28, alignItems: 'center', paddingTop: 1 },
  featureText: { flex: 1, gap: 3 },
  featureTitle: {
    fontFamily: ONB.font.bold,
    fontSize: 15.5,
    color: ONB.textDark,
    letterSpacing: -0.2,
  },
  featureDesc: {
    fontFamily: ONB.font.medium,
    fontSize: 13,
    lineHeight: 18,
    color: ONB.textMedium,
  },
  primary: {
    height: 56,
    borderRadius: 18,
    backgroundColor: ONB.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  primaryText: { fontFamily: ONB.font.semibold, fontSize: 17, color: '#FFFFFF' },
  secondary: {
    height: 56,
    borderRadius: 18,
    backgroundColor: ONB.card,
    borderWidth: 1,
    borderColor: ONB.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryText: { fontFamily: ONB.font.semibold, fontSize: 17, color: ONB.textDark },
  finePrint: {
    fontFamily: ONB.font.medium,
    fontSize: 12,
    color: ONB.textLight,
    textAlign: 'center',
    marginTop: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  footerLink: { fontFamily: ONB.font.medium, fontSize: 13, color: ONB.textLight },
  footerDot: { fontFamily: ONB.font.medium, fontSize: 13, color: ONB.textLight },
});
