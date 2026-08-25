import React, { useState } from 'react';
import { FieldRow } from './FieldRow';
import { DurationPickerModal } from '@/components/durationPicker/DurationPickerModal';
import { minutesToDurationLabel } from '@/domain/time';
import { useTranslation } from '@/i18n';
import type { IconName } from '@/components/Icon';

interface DurationFieldRowProps {
  icon: IconName;
  label: string;
  /** Duración total en minutos. */
  minutes: number;
  onChange: (minutes: number) => void;
  showBorder?: boolean;
}

/** Fila icono + etiqueta + valor que, al tocarla, abre el mismo tipo de modal
 * de wheel-picker que `TimeFieldRow`/`DateFieldRow` — reemplaza el ciclo de
 * presets fijos (30 min/1 hr/1.5 hr/2 hr) del campo Duración de Event. */
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
