import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FloatingBar } from '@/components/FloatingBar';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { Toggle } from '@/components/Toggle';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation, type TranslationKey } from '@/i18n';
import { useSettingsStore, type ThemePreference } from '@/store/settingsStore';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { getNotificationPermissionStatus, requestNotificationPermission } from '@/services/notifications';

const THEME_LABEL_KEY: Record<ThemePreference, TranslationKey> = {
  system: 'themeSystem',
  light: 'themeLight',
  dark: 'themeDark',
};

export function SettingsScreen() {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const icloudSyncEnabled = useSettingsStore((s) => s.icloudSyncEnabled);
  const setIcloudSyncEnabled = useSettingsStore((s) => s.setIcloudSyncEnabled);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const [notificationsCanAskAgain, setNotificationsCanAskAgain] = useState(true);
  const habitsInTodayEnabled = useSettingsStore((s) => s.habitsInTodayEnabled);
  const setHabitsInTodayEnabled = useSettingsStore((s) => s.setHabitsInTodayEnabled);
  const themePreference = useSettingsStore((s) => s.themePreference);
  const cycleThemePreference = useSettingsStore((s) => s.cycleThemePreference);
  const language = useSettingsStore((s) => s.language);
  const cycleLanguage = useSettingsStore((s) => s.cycleLanguage);

  // Solo para saber si el diálogo nativo todavía puede aparecer al tocar
  // "activar" — no gobierna el valor del toggle (ver `notificationsEnabled`,
  // la preferencia LOCAL de la app). Se refresca en cada foco porque el
  // usuario puede volver de Ajustes del sistema habiendo cambiado el permiso.
  useFocusEffect(
    useCallback(() => {
      getNotificationPermissionStatus().then((status) => {
        setNotificationsCanAskAgain(status.canAskAgain);
      });
    }, []),
  );

  // Mismo patrón que "my-wallet-app" (`handleBudgetAlertToggle`): apagar es
  // instantáneo y 100% local, nunca toca el SO — la app no puede revocar el
  // permiso de todas formas. Prender sí intenta el diálogo nativo primero, y
  // solo abre Ajustes del sistema si el permiso ya fue rechazado de forma
  // permanente (el único caso sin salida dentro de la app).
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

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScreenHeader
        style={{ paddingHorizontal: 16 }}
        title={
          <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: palette.text }}>
            {t('settings')}
          </Text>
        }
        subtitle={
          <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>
            {t('settingsSubtitle')}
          </Text>
        }
      />

      <ScrollView
        style={{ flex: 1, marginTop: 24 }}
        contentContainerStyle={[styles.content, { paddingHorizontal: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title={t('settingsSectionGeneral')}>
          <SettingRow
            icon="cloud"
            title={t('settingsIcloudSync')}
            subtitle={t('settingsIcloudSyncSubtitle')}
            showBorder
            right={<Toggle value={icloudSyncEnabled} onValueChange={setIcloudSyncEnabled} />}
          />
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
          <SettingRow
            icon="repeat"
            title={t('settingsHabitsInToday')}
            right={<Toggle value={habitsInTodayEnabled} onValueChange={setHabitsInTodayEnabled} />}
          />
        </SettingsSection>

        <SettingsSection title={t('settingsSectionConnections')}>
          <SettingRow
            icon="favorite"
            title={t('settingsAppleHealth')}
            showBorder
            right={<Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>{t('settingsSources', { n: 6 })}</Text>}
          />
          <SettingRow
            icon="calendar-today"
            title={t('settingsCalendars')}
            right={<Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>{t('settingsSelected', { n: 3 })}</Text>}
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
            right={
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>
                {language === 'es' ? t('settingsLanguageSpanish') : t('settingsLanguageEnglish')}
              </Text>
            }
          />
        </SettingsSection>
      </ScrollView>

      <FloatingBar
        fabSize={48}
        barRadius={24}
        onMenuPress={() => useNavigateMenuStore.getState().open()}
        center={
          <View style={styles.pill}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('settings')}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: palette.textDim }}>
              {t(THEME_LABEL_KEY[themePreference])}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 160 },
  pill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
