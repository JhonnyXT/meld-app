import React, { useState } from 'react';
import { FieldRow } from './FieldRow';
import { DatePickerModal } from '@/components/datePicker/DatePickerModal';
import { useTranslation } from '@/i18n';
import { toDateKey, addDays, formatDayBarDate } from '@/domain/date';
import type { IconName } from '@/components/Icon';

interface DateFieldRowProps {
  icon: IconName;
  label: string;
  /** `null` = Inbox (sin fecha). */
  dateKey: string | null;
  onChange: (dateKey: string | null) => void;
  allowInbox?: boolean;
  showBorder?: boolean;
}

/** Fila icono + etiqueta + valor que, al tocarla, abre un modal de calendario
 * de mes — reemplaza el ciclo Hoy/Mañana (o Inbox/Hoy/Mañana) por selección
 * de cualquier día. */
export function DateFieldRow({ icon, label, dateKey, onChange, allowInbox, showBorder = true }: DateFieldRowProps) {
  const { t, lang } = useTranslation();
  const [pickerVisible, setPickerVisible] = useState(false);

  const todayKey = toDateKey(new Date());
  const tomorrowKey = toDateKey(addDays(new Date(), 1));

  const value =
    dateKey === null
      ? t('inbox')
      : dateKey === todayKey
        ? t('today')
        : dateKey === tomorrowKey
          ? t('tomorrow')
          : formatDayBarDate(new Date(`${dateKey}T00:00:00`), lang);

  return (
    <>
      <FieldRow icon={icon} label={label} value={value} onPress={() => setPickerVisible(true)} showBorder={showBorder} />
      <DatePickerModal
        visible={pickerVisible}
        selectedDateKey={dateKey}
        allowInbox={allowInbox}
        onCancel={() => setPickerVisible(false)}
        onSelect={(next) => {
          onChange(next);
          setPickerVisible(false);
        }}
      />
    </>
  );
}
