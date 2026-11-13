import React, { useState } from 'react';
import { FieldRow } from './FieldRow';
import { AutoTrackModal } from '@/components/habitAutoTrack/AutoTrackModal';
import { findHealthMetricOption } from '@/domain/healthMetrics';
import { useTranslation } from '@/i18n';
import type { IconName } from '@/components/Icon';

interface HealthAutoTrackFieldRowProps {
  icon: IconName;
  label: string;
  metricId: string | null;
  target: number | null;
  onChange: (metricId: string | null, target: number | null) => void;
  showBorder?: boolean;
}

export function HealthAutoTrackFieldRow({ icon, label, metricId, target, onChange, showBorder = true }: HealthAutoTrackFieldRowProps) {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const option = findHealthMetricOption(metricId);

  return (
    <>
      <FieldRow
        icon={icon}
        label={label}
        value={option ? t(option.labelKey) : t('offLabel')}
        onPress={() => setModalVisible(true)}
        showBorder={showBorder}
      />
      <AutoTrackModal
        visible={modalVisible}
        metricId={metricId}
        target={target}
        onCancel={() => setModalVisible(false)}
        onConfirm={(nextId, nextTarget) => {
          onChange(nextId, nextTarget);
          setModalVisible(false);
        }}
      />
    </>
  );
}
