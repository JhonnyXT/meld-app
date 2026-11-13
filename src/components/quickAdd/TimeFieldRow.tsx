import React, { useState } from 'react';
import { FieldRow } from './FieldRow';
import { TimePickerModal } from '@/components/timePicker/TimePickerModal';
import { minutesToLabel, ANY_TIME_MINUTES } from '@/domain/time';
import { useTranslation } from '@/i18n';
import type { IconName } from '@/components/Icon';

interface TimeFieldRowProps {
  icon: IconName;
  label: string;
  minutes: number | null;
  onChange: (minutes: number | null) => void;
  offLabel: string;
  clearable?: boolean;
  allowAnyTime?: boolean;
  showBorder?: boolean;
}

export function TimeFieldRow({
  icon,
  label,
  minutes,
  onChange,
  offLabel,
  clearable,
  allowAnyTime,
  showBorder = true,
}: TimeFieldRowProps) {
  const { t } = useTranslation();
  const [pickerVisible, setPickerVisible] = useState(false);
  const isAnyTime = minutes === ANY_TIME_MINUTES;

  return (
    <>
      <FieldRow
        icon={icon}
        label={label}
        value={minutes === null ? offLabel : isAnyTime ? t('anyTime') : minutesToLabel(minutes)}
        onPress={() => setPickerVisible(true)}
        onClear={clearable && minutes !== null ? () => onChange(null) : undefined}
        showBorder={showBorder}
      />
      <TimePickerModal
        visible={pickerVisible}
        valueMinutes={minutes !== null && !isAnyTime ? minutes : 9 * 60}
        onCancel={() => setPickerVisible(false)}
        onConfirm={(next) => {
          onChange(next);
          setPickerVisible(false);
        }}
        onSelectAnyTime={
          allowAnyTime
            ? () => {
                onChange(ANY_TIME_MINUTES);
                setPickerVisible(false);
              }
            : undefined
        }
      />
    </>
  );
}
