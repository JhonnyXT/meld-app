import type { ImageSourcePropType } from 'react-native';
import type { TranslationKey } from '@/i18n';

/** Encuadre del mockup: cómo se dimensiona la imagen enmarcada en su slide. */
export type MockFraming = 'wide' | 'portrait';

export interface MockAccent {
  /** Ícono flotante que resalta la feature (posición aprox, no pixel-perfect). */
  icon: 'check-circle' | 'flame' | 'photo-camera' | 'calendar-today';
  /**
   * Centro del acento sobre el mockup, en fracción 0..1 del PNG enmarcado.
   * El badge/anillo se centra en este punto (no ancla su borde).
   */
  x: number;
  y: number;
  /**
   * Escala del badge+anillo (1 = tamaño base 40/56 px). Se baja cuando el
   * acento tiene que caber en un espacio chico del mockup — p. ej. una celda
   * de día del calendario.
   */
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
  /** ancho/alto del contenido real del PNG (ya recortado al bbox alfa). */
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
    // Sobre el checkbox de la primera tarea de la lista de Hoy.
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
    // Sobre el cuadro de completar (a la izquierda) de una fila de hábito.
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
    // Sobre el botón "+" de agregar foto (primera semana).
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
    // Centrado en una celda de día del grid de Mes — mismo tamaño que el
    // acento del resto de slides (sin `scale`).
    accent: { icon: 'calendar-today', x: 0.423, y: 0.385 },
  },
  {
    key: 'plans',
    kind: 'plans',
    titleKey: 'onbPlansTitle',
    subtitleKey: 'onbPlansSubtitle',
  },
];
