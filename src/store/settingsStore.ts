import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AccentId, defaultAccent } from '@/theme/tokens';
import type { Language } from '@/i18n/translations';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ListSpacing = 'compact' | 'comfortable';
export type CompletedItemStyle = 'strikethrough' | 'fade' | 'checkmarkOnly';

interface SettingsState {
  themePreference: ThemePreference;
  accent: AccentId;
  language: Language;
  listSpacing: ListSpacing;
  completedItemStyle: CompletedItemStyle;
  coolHabitsEnabled: boolean;
  /** Placeholder de arquitectura para el sync colaborativo Pro (sección 2 del spec). */
  icloudSyncEnabled: boolean;
  /** Preferencia LOCAL de la app, independiente del permiso real del SO — la
   * app no puede revocar el permiso de notificaciones del sistema, así que
   * apagar esto no toca el SO en absoluto, solo deja de programar
   * recordatorios (ver `services/notifications.ts` → `syncReminderNotification`
   * y CLAUDE.md → "Notificaciones: preferencia local vs. permiso del SO").
   * Mismo patrón que `notificationsEnabled` en my-wallet-app. */
  notificationsEnabled: boolean;
  habitsInTodayEnabled: boolean;
  setThemePreference: (value: ThemePreference) => void;
  setLanguage: (value: Language) => void;
  cycleLanguage: () => void;
  setAccent: (value: AccentId) => void;
  setListSpacing: (value: ListSpacing) => void;
  setCompletedItemStyle: (value: CompletedItemStyle) => void;
  setCoolHabitsEnabled: (value: boolean) => void;
  setIcloudSyncEnabled: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setHabitsInTodayEnabled: (value: boolean) => void;
  cycleThemePreference: () => void;
}

const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      themePreference: 'system',
      accent: defaultAccent,
      language: 'es',
      listSpacing: 'comfortable',
      completedItemStyle: 'strikethrough',
      coolHabitsEnabled: false,
      icloudSyncEnabled: true,
      notificationsEnabled: true,
      habitsInTodayEnabled: true,
      setThemePreference: (themePreference) => set({ themePreference }),
      setAccent: (accent) => set({ accent }),
      setLanguage: (language) => set({ language }),
      cycleLanguage: () => set({ language: get().language === 'es' ? 'en' : 'es' }),
      setListSpacing: (listSpacing) => set({ listSpacing }),
      setCompletedItemStyle: (completedItemStyle) => set({ completedItemStyle }),
      setCoolHabitsEnabled: (coolHabitsEnabled) => set({ coolHabitsEnabled }),
      setIcloudSyncEnabled: (icloudSyncEnabled) => set({ icloudSyncEnabled }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setHabitsInTodayEnabled: (habitsInTodayEnabled) => set({ habitsInTodayEnabled }),
      cycleThemePreference: () => {
        const next = THEME_CYCLE[(THEME_CYCLE.indexOf(get().themePreference) + 1) % THEME_CYCLE.length];
        set({ themePreference: next });
      },
    }),
    {
      name: 'trove-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
