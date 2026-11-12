import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AccentId, defaultAccent } from '@/theme/tokens';
import type { Language } from '@/i18n/translations';
import { expiredTrialStart, trialDaysLeft } from '@/domain/trial';
import { emitLocalChange } from '@/data/local/localChanges';
import type { AppSettingsDoc } from '@/sync/mappers';

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
  notificationsEnabled: boolean;
  habitsInTodayEnabled: boolean;
  onboardingCompleted: boolean;
  plan: PlanTier;
  trialStartedAt: string | null;
  trialEndedNotice: boolean;
  settingsUpdatedAt: string | null;
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
  startProTrial: () => void;
  expireTrialIfDue: () => void;
  subscribePro: () => void;
  dismissTrialEndedNotice: () => void;
  simulateTrialExpired: () => void;
  cycleThemePreference: () => void;
  applyRemoteSettings: (doc: AppSettingsDoc) => void;
}

const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];
const LIST_SPACING_CYCLE: ListSpacing[] = ['comfortable', 'compact'];
const COMPLETED_STYLE_CYCLE: CompletedItemStyle[] = ['strikethrough', 'fade', 'checkmarkOnly'];

function touch(set: (patch: Partial<SettingsState>) => void, patch: Partial<SettingsState>): void {
  set({ ...patch, settingsUpdatedAt: new Date().toISOString() });
  emitLocalChange();
}

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
      trialStartedAt: null,
      trialEndedNotice: false,
      settingsUpdatedAt: null,
      setThemePreference: (themePreference) => touch(set, { themePreference }),
      setAccent: (accent) => touch(set, { accent }),
      setLanguage: (language) => touch(set, { language }),
      cycleLanguage: () => touch(set, { language: get().language === 'es' ? 'en' : 'es' }),
      setListSpacing: (listSpacing) => touch(set, { listSpacing }),
      cycleListSpacing: () => {
        const next = LIST_SPACING_CYCLE[(LIST_SPACING_CYCLE.indexOf(get().listSpacing) + 1) % LIST_SPACING_CYCLE.length];
        touch(set, { listSpacing: next });
      },
      setCompletedItemStyle: (completedItemStyle) => touch(set, { completedItemStyle }),
      cycleCompletedItemStyle: () => {
        const next =
          COMPLETED_STYLE_CYCLE[(COMPLETED_STYLE_CYCLE.indexOf(get().completedItemStyle) + 1) % COMPLETED_STYLE_CYCLE.length];
        touch(set, { completedItemStyle: next });
      },
      setCoolHabitsEnabled: (coolHabitsEnabled) => touch(set, { coolHabitsEnabled }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setHabitsInTodayEnabled: (habitsInTodayEnabled) => touch(set, { habitsInTodayEnabled }),
      setOnboardingCompleted: (onboardingCompleted) => touch(set, { onboardingCompleted }),
      setPlan: (plan) => set({ plan }),
      startProTrial: () =>
        set({ plan: 'pro', trialStartedAt: new Date().toISOString(), trialEndedNotice: false }),
      expireTrialIfDue: () => {
        const { plan, trialStartedAt } = get();
        if (plan !== 'pro' || !trialStartedAt || trialDaysLeft(trialStartedAt) > 0) return;
        set({ plan: 'free', trialStartedAt: null, trialEndedNotice: true });
      },
      subscribePro: () => set({ plan: 'pro', trialStartedAt: null, trialEndedNotice: false }),
      dismissTrialEndedNotice: () => set({ trialEndedNotice: false }),
      simulateTrialExpired: () => set({ plan: 'pro', trialStartedAt: expiredTrialStart() }),
      cycleThemePreference: () => {
        const next = THEME_CYCLE[(THEME_CYCLE.indexOf(get().themePreference) + 1) % THEME_CYCLE.length];
        touch(set, { themePreference: next });
      },
      applyRemoteSettings: (doc) =>
        set({
          themePreference: doc.theme as ThemePreference,
          accent: doc.accent as AccentId,
          language: doc.language as Language,
          listSpacing: doc.listSpacing as ListSpacing,
          completedItemStyle: doc.completedItemStyle as CompletedItemStyle,
          habitsInTodayEnabled: doc.habitsInToday,
          coolHabitsEnabled: doc.coolHabits,
          onboardingCompleted: doc.onboardingCompleted,
          settingsUpdatedAt: doc.updatedAt,
        }),
    }),
    {
      name: 'meld-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
