import type { ImageSourcePropType } from 'react-native';
import type { TranslationKey } from '@/i18n';

export type MockFraming = 'wide' | 'portrait';

export interface MockAccent {
  icon: 'check-circle' | 'flame' | 'photo-camera' | 'calendar-today';
  x: number;
  y: number;
  scale?: number;
}

interface BaseSlide {
  key: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
}

export interface WelcomeSlide extends BaseSlide {
  kind: 'welcome';
}
export interface MockSlide extends BaseSlide {
  kind: 'mock';
  mock: ImageSourcePropType;
  ratio: number;
  framing: MockFraming;
  accent: MockAccent;
}
export interface PlansSlide extends BaseSlide {
  kind: 'plans';
}

export type OnboardingSlide = WelcomeSlide | MockSlide | PlansSlide;

export const SLIDES: OnboardingSlide[] = [
  {
    key: 'welcome',
    kind: 'welcome',
    titleKey: 'onbWelcomeTitle',
    subtitleKey: 'onbWelcomeSubtitle',
  },
  {
    key: 'today',
    kind: 'mock',
    titleKey: 'onbTodayTitle',
    subtitleKey: 'onbTodaySubtitle',
    mock: require('../../../assets/onboarding/mock-today.png'),
    ratio: 893 / 1340,
    framing: 'portrait',
    accent: { icon: 'check-circle', x: 0.4, y: 0.205 },
  },
  {
    key: 'habits',
    kind: 'mock',
    titleKey: 'onbHabitsTitle',
    subtitleKey: 'onbHabitsSubtitle',
    mock: require('../../../assets/onboarding/mock-habits.png'),
    ratio: 1462 / 1440,
    framing: 'wide',
    accent: { icon: 'check-circle', x: 0.375, y: 0.19 },
  },
  {
    key: 'capture',
    kind: 'mock',
    titleKey: 'onbCaptureTitle',
    subtitleKey: 'onbCaptureSubtitle',
    mock: require('../../../assets/onboarding/mock-moments.png'),
    ratio: 893 / 1340,
    framing: 'portrait',
    accent: { icon: 'photo-camera', x: 0.524, y: 0.365 },
  },
  {
    key: 'calendar',
    kind: 'mock',
    titleKey: 'onbCalendarTitle',
    subtitleKey: 'onbCalendarSubtitle',
    mock: require('../../../assets/onboarding/mock-calendar.png'),
    ratio: 893 / 1340,
    framing: 'portrait',
    accent: { icon: 'calendar-today', x: 0.423, y: 0.385 },
  },
  {
    key: 'plans',
    kind: 'plans',
    titleKey: 'onbPlansTitle',
    subtitleKey: 'onbPlansSubtitle',
  },
];
