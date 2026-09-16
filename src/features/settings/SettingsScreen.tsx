import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FloatingBar } from '@/components/FloatingBar';
import { Icon } from '@/components/Icon';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingRow } from '@/components/settings/SettingRow';
import { AccentColorRow } from '@/components/settings/AccentColorRow';
import { Toggle } from '@/components/Toggle';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation, type TranslationKey } from '@/i18n';
import {
  useSettingsStore,
  type ThemePreference,
  type ListSpacing,
  type CompletedItemStyle,
} from '@/store/settingsStore';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { useCategoriesSheetStore } from '@/store/categoriesSheetStore';
import { getNotificationPermissionStatus, requestNotificationPermission } from '@/services/notifications';

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
  const { t } = useTranslation();
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
            onPress={() => useCategoriesSheetStore.getState().open()}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 160 },
  pill: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
