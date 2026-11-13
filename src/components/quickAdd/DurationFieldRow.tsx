import React, { useState } from 'react';
import { FieldRow } from './FieldRow';
import { DurationPickerModal } from '@/components/durationPicker/DurationPickerModal';
import { minutesToDurationLabel } from '@/domain/time';
import { useTranslation } from '@/i18n';
import type { IconName } from '@/components/Icon';

interface DurationFieldRowProps {
  icon: IconName;
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  showBorder?: boolean;
}

export function DurationFieldRow({ icon, label, minutes, onChange, showBorder = true }: DurationFieldRowProps) {
  const { lang } = useTranslation();
  const [pickerVisible, setPickerVisible] = useState(false);

  return (
    <>
      <FieldRow
        icon={icon}
        label={label}
        value={minutesToDurationLabel(minutes, lang)}
        onPress={() => setPickerVisible(true)}
        showBorder={showBorder}
      />
      <DurationPickerModal
        visible={pickerVisible}
        valueMinutes={minutes}
        onCancel={() => setPickerVisible(false)}
        onConfirm={(next) => {
          onChange(next);
          setPickerVisible(false);
        }}
      />
    </>
  );
}
