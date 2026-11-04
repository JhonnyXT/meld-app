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
  /** ISO de cuándo empezó la prueba de Pro (simulada, ver `domain/trial.ts`).
   * `null` con `plan: 'pro'` = Pro "pagado" (también simulado). */
  trialStartedAt: string | null;
  /** La prueba venció y todavía no se mostró el aviso (`TrialEndedDialog`). */
  trialEndedNotice: boolean;
  /** Última edición de un ajuste SINCRONIZABLE (SYNC_ROADMAP.md, Fase 3 — "Ajustes visuales"):
   * tema/acento/idioma/espaciado/estilo de completado/hábitos en Hoy/hábitos "cool"/onboarding.
   * `null` = nunca se tocó en este teléfono (instalación nueva con los defaults de arriba) — en
   * ese caso `src/sync/engine.ts` nunca sube nada, solo trae si hay un respaldo en la nube.
   * `notificationsEnabled` y `plan`/prueba quedan afuera a propósito (ver `AppSettingsDoc`). */
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
  /** Si la prueba venció: vuelve a Free y deja el aviso pendiente. Se llama al
   * abrir la app y cada vez que vuelve a primer plano. */
  expireTrialIfDue: () => void;
  subscribePro: () => void;
  dismissTrialEndedNotice: () => void;
  /** Solo dev/test: deja la prueba vencida para ver el aviso al reabrir. */
  simulateTrialExpired: () => void;
  cycleThemePreference: () => void;
  /** Solo para `src/sync/engine.ts`: aplica un `AppSettingsDoc` ya ganador (`pickWinner`) traído
   * de la nube. A diferencia de los setters de arriba, no llama `emitLocalChange()` — aplicar lo
   * que ya bajó no debe disparar una subida inmediata de vuelta. */
  applyRemoteSettings: (doc: AppSettingsDoc) => void;
}

const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];
const LIST_SPACING_CYCLE: ListSpacing[] = ['comfortable', 'compact'];
const COMPLETED_STYLE_CYCLE: CompletedItemStyle[] = ['strikethrough', 'fade', 'checkmarkOnly'];

/** Aplica un cambio a un ajuste SINCRONIZABLE: marca `settingsUpdatedAt` (para que
 * `pickWinner` lo compare al bajar/subir) y avisa a `src/sync/` por el mismo pub-sub que ya usan
 * los repositorios de SQLite (`emitLocalChange`), con el mismo debounce de 3s para agrupar. */
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
