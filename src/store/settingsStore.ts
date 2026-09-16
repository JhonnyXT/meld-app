import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AccentId, defaultAccent } from '@/theme/tokens';
import type { Language } from '@/i18n/translations';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ListSpacing = 'compact' | 'comfortable';
export type CompletedItemStyle = 'strikethrough' | 'fade' | 'checkmarkOnly';
export type PlanTier = 'free' | 'pro';

interface SettingsState {
  themePreference: ThemePreference;
  accent: AccentId;
  language: Language;
  listSpacing: ListSpacing;
  completedItemStyle: CompletedItemStyle;
  coolHabitsEnabled: boolean;
  /** Preferencia LOCAL de la app, independiente del permiso real del SO — la
   * app no puede revocar el permiso de notificaciones del sistema, así que
   * apagar esto no toca el SO en absoluto, solo deja de programar
   * recordatorios (ver `services/notifications.ts` → `syncReminderNotification`
   * y CLAUDE.md → "Notificaciones: preferencia local vs. permiso del SO").
   * Mismo patrón que `notificationsEnabled` en my-wallet-app. */
  notificationsEnabled: boolean;
  habitsInTodayEnabled: boolean;
  /** Se muestra una sola vez, la primera vez que se abre la app (ver
   * `OnboardingScreen`/`app/_layout.tsx`) — nunca se resetea automáticamente. */
  onboardingCompleted: boolean;
  /** Plan del usuario. HOY es un flag 100% local elegido en la pantalla de
   * Planes del onboarding — todavía no hay RevenueCat ni gating real de
   * features (ver CLAUDE.md → "## Roadmap Pro"). */
  plan: PlanTier;
  setThemePreference: (value: ThemePreference) => void;
  setLanguage: (value: Language) => void;
  cycleLanguage: () => void;
  setAccent: (value: AccentId) => void;
  setListSpacing: (value: ListSpacing) => void;
  cycleListSpacing: () => void;
  setCompletedItemStyle: (value: CompletedItemStyle) => void;
  cycleCompletedItemStyle: () => void;
  setCoolHabitsEnabled: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setHabitsInTodayEnabled: (value: boolean) => void;
  setOnboardingCompleted: (value: boolean) => void;
  setPlan: (value: PlanTier) => void;
  cycleThemePreference: () => void;
}

const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];
const LIST_SPACING_CYCLE: ListSpacing[] = ['comfortable', 'compact'];
const COMPLETED_STYLE_CYCLE: CompletedItemStyle[] = ['strikethrough', 'fade', 'checkmarkOnly'];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      themePreference: 'system',
      accent: defaultAccent,
      language: 'es',
      listSpacing: 'comfortable',
      completedItemStyle: 'strikethrough',
      coolHabitsEnabled: false,
      notificationsEnabled: true,
      habitsInTodayEnabled: true,
      onboardingCompleted: false,
      plan: 'free',
      setThemePreference: (themePreference) => set({ themePreference }),
      setAccent: (accent) => set({ accent }),
      setLanguage: (language) => set({ language }),
      cycleLanguage: () => set({ language: get().language === 'es' ? 'en' : 'es' }),
      setListSpacing: (listSpacing) => set({ listSpacing }),
      cycleListSpacing: () => {
        const next = LIST_SPACING_CYCLE[(LIST_SPACING_CYCLE.indexOf(get().listSpacing) + 1) % LIST_SPACING_CYCLE.length];
        set({ listSpacing: next });
      },
      setCompletedItemStyle: (completedItemStyle) => set({ completedItemStyle }),
      cycleCompletedItemStyle: () => {
        const next =
          COMPLETED_STYLE_CYCLE[(COMPLETED_STYLE_CYCLE.indexOf(get().completedItemStyle) + 1) % COMPLETED_STYLE_CYCLE.length];
        set({ completedItemStyle: next });
      },
      setCoolHabitsEnabled: (coolHabitsEnabled) => set({ coolHabitsEnabled }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setHabitsInTodayEnabled: (habitsInTodayEnabled) => set({ habitsInTodayEnabled }),
      setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
      setPlan: (plan) => set({ plan }),
      cycleThemePreference: () => {
        const next = THEME_CYCLE[(THEME_CYCLE.indexOf(get().themePreference) + 1) % THEME_CYCLE.length];
        set({ themePreference: next });
      },
    }),
    {
      name: 'meld-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
