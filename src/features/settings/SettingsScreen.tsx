import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, Linking } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FloatingBar } from '@/components/FloatingBar';
import { Icon } from '@/components/Icon';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { AccentColorRow } from '@/components/settings/AccentColorRow';
import { Toggle } from '@/components/Toggle';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  useSession,
  useSyncStatus,
  signInWithGoogle,
  signOutKeepingLocalData,
  signOutAndWipeLocalData,
  deleteAccountAndCloudData,
  pendingChanges,
  syncNow,
  AuthError,
  authErrorMessage,
} from '@/sync';
import { formatRelativeCreated } from '@/domain/date';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation, type TranslationKey } from '@/i18n';
import {
  useSettingsStore,
  type ThemePreference,
  type ListSpacing,
  type CompletedItemStyle,
} from '@/store/settingsStore';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { getNotificationPermissionStatus, requestNotificationPermission, scheduleTestReminder } from '@/services/notifications';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { useDayItemsStore } from '@/store/dayItemsStore';
import { toDateKey } from '@/domain/date';
import { trialDaysLeft } from '@/domain/trial';
import { isDev, isTest } from '@/constants/appVariant';
import { newId } from '@/domain/id';

const THEME_LABEL_KEY: Record<ThemePreference, TranslationKey> = {
  system: 'themeSystem',
  light: 'themeLight',
  dark: 'themeDark',
};

const LIST_SPACING_LABEL_KEY: Record<ListSpacing, TranslationKey> = {
  comfortable: 'listSpacingComfortable',
  compact: 'listSpacingCompact',
};

const COMPLETED_STYLE_LABEL_KEY: Record<CompletedItemStyle, TranslationKey> = {
  strikethrough: 'completedStyleStrikethrough',
  fade: 'completedStyleFade',
  checkmarkOnly: 'completedStyleCheckmarkOnly',
};

export function SettingsScreen() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const [notificationsCanAskAgain, setNotificationsCanAskAgain] = useState(true);
  const habitsInTodayEnabled = useSettingsStore((s) => s.habitsInTodayEnabled);
  const setHabitsInTodayEnabled = useSettingsStore((s) => s.setHabitsInTodayEnabled);
  const themePreference = useSettingsStore((s) => s.themePreference);
  const cycleThemePreference = useSettingsStore((s) => s.cycleThemePreference);
  const language = useSettingsStore((s) => s.language);
  const cycleLanguage = useSettingsStore((s) => s.cycleLanguage);
  const accent = useSettingsStore((s) => s.accent);
  const setAccent = useSettingsStore((s) => s.setAccent);
  const listSpacing = useSettingsStore((s) => s.listSpacing);
  const cycleListSpacing = useSettingsStore((s) => s.cycleListSpacing);
  const completedItemStyle = useSettingsStore((s) => s.completedItemStyle);
  const cycleCompletedItemStyle = useSettingsStore((s) => s.cycleCompletedItemStyle);
  const coolHabitsEnabled = useSettingsStore((s) => s.coolHabitsEnabled);
  const setCoolHabitsEnabled = useSettingsStore((s) => s.setCoolHabitsEnabled);
  const plan = useSettingsStore((s) => s.plan);
  const trialStartedAt = useSettingsStore((s) => s.trialStartedAt);
  const onTrial = plan === 'pro' && trialStartedAt !== null;
  const planSubtitle = onTrial
    ? t('settingsPlanTrial', { days: trialDaysLeft(trialStartedAt) })
    : plan === 'pro'
      ? t('settingsPlanPro')
      : t('settingsPlanFree');

  useFocusEffect(
    useCallback(() => {
      getNotificationPermissionStatus().then((status) => {
        setNotificationsCanAskAgain(status.canAskAgain);
      });
    }, []),
  );

  const handleTestReminder = async () => {
    const now = new Date();
    const item = {
      id: newId(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      date: toDateKey(now),
      title: t('testReminderTaskTitle'),
      category: null,
      categoryColor: null,
      reminderAt: null,
      status: 'scheduled' as const,
      type: 'task' as const,
      priority: 'none' as const,
      repeatRule: null,
      link: null,
    };
    await dayItemRepository.upsert(item);
    useDayItemsStore.getState().reload();
    await scheduleTestReminder(item);
  };

  const handleNotificationsToggle = async (next: boolean) => {
    if (!next) {
      setNotificationsEnabled(false);
      return;
    }
    if (!notificationsCanAskAgain) {
      Linking.openSettings();
      return;
    }
    const status = await requestNotificationPermission();
    setNotificationsCanAskAgain(status.canAskAgain);
    if (status.granted) setNotificationsEnabled(true);
  };

  const { user: sessionUser } = useSession();
  const syncStatus = useSyncStatus();
  const syncStatusLabel = (() => {
    switch (syncStatus.phase) {
      case 'syncing':
        return t('settingsAccountSyncing');
      case 'offline':
        return t('settingsAccountOffline');
      case 'error':
        return t('settingsAccountSyncError');
      case 'paused':
        return t('settingsAccountPaused');
      default:
        if (syncStatus.pending > 0) return t('settingsAccountPending', { count: syncStatus.pending });
        return syncStatus.lastSyncAt
          ? t('settingsAccountSynced', { time: formatRelativeCreated(new Date(syncStatus.lastSyncAt).toISOString(), lang) })
          : t('settingsAccountNeverSynced');
    }
  })();
  const [accountBusy, setAccountBusy] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [signOutPending, setSignOutPending] = useState<number | null>(null);

  const handleSignIn = async () => {
    setAccountBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const message = e instanceof AuthError ? authErrorMessage(e.kind) : authErrorMessage('unknown');
      if (message) console.warn('[account] sign-in failed:', message);
    } finally {
      setAccountBusy(false);
    }
  };

  const openSignOutDialog = async () => {
    setAccountBusy(true);
    try {
      setSignOutPending(await pendingChanges());
    } finally {
      setAccountBusy(false);
    }
  };

  const handleSignOutKeep = async () => {
    setSignOutPending(null);
    setAccountBusy(true);
    try {
      await signOutKeepingLocalData();
    } finally {
      setAccountBusy(false);
    }
  };

  const handleSignOutWipe = async () => {
    setSignOutPending(null);
    setAccountBusy(true);
    try {
      await signOutAndWipeLocalData();
    } finally {
      setAccountBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteConfirmVisible(false);
    setAccountBusy(true);
    try {
      await deleteAccountAndCloudData();
    } finally {
      setAccountBusy(false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScreenHeader
        style={{ paddingHorizontal: 16 }}
        title={
          <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 46, letterSpacing: -1, color: palette.text }}>
            {t('settings')}
          </Text>
        }
        subtitle={
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: palette.textDim }}>
            {t('settingsSubtitle')}
          </Text>
        }
      />

      <ScrollView
        style={{ flex: 1, marginTop: 24 }}
        contentContainerStyle={[styles.content, { paddingHorizontal: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title={t('settingsSectionAccount')}>
          {sessionUser ? (
            <>
              <SettingRow
                icon="person"
                title={sessionUser.name ?? sessionUser.email ?? ''}
                subtitle={sessionUser.email ? t('settingsAccountSignedInAs', { email: sessionUser.email }) : undefined}
                showBorder
              />
              <SettingRow
                icon="cloud"
                title={syncStatusLabel}
                showBorder
                onPress={accountBusy ? undefined : () => void syncNow()}
              />
              <SettingRow
                icon="log-out"
                title={t('settingsAccountSignOut')}
                showBorder
                onPress={accountBusy ? undefined : openSignOutDialog}
              />
              <SettingRow
                icon="delete-outline"
                title={t('settingsAccountDeleteAccount')}
                onPress={accountBusy ? undefined : () => setDeleteConfirmVisible(true)}
              />
            </>
          ) : (
            <SettingRow
              icon="person"
              title={t('settingsAccountSignIn')}
              subtitle={t('settingsAccountSignInSubtitle')}
              onPress={accountBusy ? undefined : handleSignIn}
              right={<Icon name="chevron-right" size={18} color={palette.textDim} />}
            />
          )}
        </SettingsSection>

        <SettingsSection title={t('settingsSectionPlan')}>
          <SettingRow
            icon="sparkles"
            title={plan === 'pro' ? 'Meld Pro' : 'Meld Free'}
            subtitle={planSubtitle}
            showBorder={isDev || isTest}
          />
          {(isDev || isTest) && (
            <SettingRow
              icon="schedule"
              title={
                onTrial
                  ? t('settingsSimTrialEnd')
                  : plan === 'pro'
                    ? t('settingsSimBackToFree')
                    : t('settingsSimStartTrial')
              }
              subtitle={onTrial ? t('settingsSimTrialEndSubtitle') : t('settingsSimSubtitle')}
              onPress={() => {
                const st = useSettingsStore.getState();
                if (onTrial) st.simulateTrialExpired();
                else if (plan === 'pro') st.setPlan('free');
                else st.startProTrial();
              }}
              right={<Icon name="chevron-right" size={18} color={palette.textDim} />}
            />
          )}
        </SettingsSection>

        <SettingsSection title={t('settingsSectionGeneral')}>
          <SettingRow
            icon="notifications"
            title={t('settingsNotifications')}
            subtitle={
              notificationsEnabled
                ? t('settingsNotificationsSubtitle')
                : notificationsCanAskAgain
                  ? t('settingsNotificationsSubtitleOff')
                  : t('settingsNotificationsSubtitleBlocked')
            }
            showBorder
            right={<Toggle value={notificationsEnabled} onValueChange={handleNotificationsToggle} />}
          />
          {(isDev || isTest) && (
            <SettingRow
              icon="notifications"
              title={t('settingsTestReminder')}
              subtitle={t('settingsTestReminderSubtitle')}
              showBorder
              onPress={handleTestReminder}
              right={<Icon name="chevron-right" size={18} color={palette.textDim} />}
            />
          )}
          <SettingRow
            icon="repeat"
            title={t('settingsHabitsInToday')}
            showBorder
            right={<Toggle value={habitsInTodayEnabled} onValueChange={setHabitsInTodayEnabled} />}
          />
          <SettingRow
            icon="folder"
            title={t('settingsCategories')}
            subtitle={t('settingsCategoriesSubtitle')}
            onPress={() => router.push('/categories')}
            right={<Icon name="chevron-right" size={18} color={palette.textDim} />}
          />
        </SettingsSection>

        <SettingsSection title={t('settingsSectionAppearance')}>
          <SettingRow
            icon="light-mode"
            title={t('settingsTheme')}
            onPress={cycleThemePreference}
            showBorder
            right={
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>
                {t(THEME_LABEL_KEY[themePreference])}
              </Text>
            }
          />
          <SettingRow
            icon="language"
            title={t('settingsLanguage')}
            onPress={cycleLanguage}
            showBorder
            right={
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>
                {language === 'es' ? t('settingsLanguageSpanish') : t('settingsLanguageEnglish')}
              </Text>
            }
          />
          <AccentColorRow value={accent} onChange={setAccent} />
          <SettingRow
            icon="rows"
            title={t('settingsListSpacing')}
            onPress={cycleListSpacing}
            showBorder
            right={
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>
                {t(LIST_SPACING_LABEL_KEY[listSpacing])}
              </Text>
            }
          />
          <SettingRow
            icon="check-circle"
            title={t('settingsCompletedStyle')}
            onPress={cycleCompletedItemStyle}
            showBorder
            right={
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>
                {t(COMPLETED_STYLE_LABEL_KEY[completedItemStyle])}
              </Text>
            }
          />
          <SettingRow
            icon="sparkles"
            title={t('settingsCoolHabits')}
            subtitle={t('settingsCoolHabitsSubtitle')}
            right={<Toggle value={coolHabitsEnabled} onValueChange={setCoolHabitsEnabled} />}
          />
        </SettingsSection>
      </ScrollView>

      <FloatingBar
        onMenuPress={() => useNavigateMenuStore.getState().open()}
        center={
          <View style={[styles.pill, { backgroundColor: palette.pillSolid }]}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('settings')}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: palette.textDim }}>
              {t(THEME_LABEL_KEY[themePreference])}
            </Text>
          </View>
        }
      />

      <ConfirmDialog
        visible={deleteConfirmVisible}
        icon="delete-outline"
        title={t('settingsAccountDeleteConfirmTitle')}
        message={t('settingsAccountDeleteConfirmMessage')}
        confirmLabel={t('settingsAccountDeleteConfirmButton')}
        cancelLabel={t('settingsAccountCancel')}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteConfirmVisible(false)}
      />

      {/* Cerrar sesión con Mantener/Borrar (T8): con cambios sin subir, "Borrar" ni se ofrece —
          solo queda cerrar sesión manteniendo los datos (nunca se pierde nada sin aviso). */}
      <ConfirmDialog
        visible={signOutPending !== null}
        icon="log-out"
        title={t('settingsAccountSignOutConfirmTitle')}
        message={
          signOutPending && signOutPending > 0
            ? t('settingsAccountSignOutPendingMessage', { count: signOutPending })
            : t('settingsAccountSignOutConfirmMessage')
        }
        cancelLabel={signOutPending && signOutPending > 0 ? t('settingsAccountCancel') : t('settingsAccountSignOutKeep')}
        confirmLabel={
          signOutPending && signOutPending > 0 ? t('settingsAccountSignOutPendingConfirm') : t('settingsAccountSignOutWipe')
        }
        tone={signOutPending && signOutPending > 0 ? 'accent' : 'danger'}
        onCancel={signOutPending && signOutPending > 0 ? () => setSignOutPending(null) : handleSignOutKeep}
        onConfirm={signOutPending && signOutPending > 0 ? handleSignOutKeep : handleSignOutWipe}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 160 },
  pill: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
