import React, { useState } from 'react';
import { FieldRow } from './FieldRow';
import { TimePickerModal } from '@/components/timePicker/TimePickerModal';
import { minutesToLabel, ANY_TIME_MINUTES } from '@/domain/time';
import { useTranslation } from '@/i18n';
import type { IconName } from '@/components/Icon';

interface TimeFieldRowProps {
  icon: IconName;
  label: string;
  /** Minutos desde medianoche, `null` cuando el campo está apagado, o
   * `ANY_TIME_MINUTES` cuando el recordatorio está encendido sin hora
   * puntual ("Cualquier hora"). */
  minutes: number | null;
  onChange: (minutes: number | null) => void;
  /** Texto mostrado cuando `minutes` es `null` (p. ej. "Apagado"). */
  offLabel: string;
  /** Cuando es `true`, muestra un botón "x" (mientras haya un valor) para
   * volver el campo a `null` sin tener que abrir el picker. */
  clearable?: boolean;
  /** Cuando es `true`, el picker ofrece la opción "Cualquier hora" además de
   * elegir una hora puntual (solo tiene sentido en campos de recordatorio,
   * no en horas reales como "Empieza" de Event). */
  allowAnyTime?: boolean;
  showBorder?: boolean;
}

/** Fila icono + etiqueta + valor que, al tocarla, abre un modal de wheel-picker
 * para elegir cualquier hora (reemplaza el ciclo/acordeón de presets fijos
 * para los campos que representan una hora real del día). */
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
