import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTranslation } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';

export function TrialEndedDialog() {
  const { t } = useTranslation();
  const visible = useSettingsStore((s) => s.trialEndedNotice);

  useEffect(() => {
    useSettingsStore.getState().expireTrialIfDue();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') useSettingsStore.getState().expireTrialIfDue();
    });
    return () => sub.remove();
  }, []);

  const settings = useSettingsStore.getState();
  return (
    <ConfirmDialog
      visible={visible}
      tone="accent"
      icon="sparkles"
      title={t('trialEndedTitle')}
      message={t('trialEndedMessage')}
      confirmLabel={t('trialEndedSubscribe')}
      cancelLabel={t('trialEndedKeepFree')}
      onConfirm={settings.subscribePro}
      onCancel={settings.dismissTrialEndedNotice}
    />
  );
}
