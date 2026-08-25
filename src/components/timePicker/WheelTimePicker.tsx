import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { WheelColumn } from './WheelColumn';

const HOUR_VALUES = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_VALUES = Array.from({ length: 60 }, (_, i) => i);
const twoDigits = (n: number) => String(n).padStart(2, '0');

interface WheelTimePickerProps {
  /** Minutos desde medianoche (0-1439), mismo formato que el resto del dominio (`domain/time.ts`). */
  valueMinutes: number;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
  /** Cuando está presente, muestra el botón "Cualquier hora" — recordatorio
   * sin hora puntual (ver `ANY_TIME_MINUTES`/`ANY_TIME_HHMM` en domain/time.ts). */
  onSelectAnyTime?: () => void;
}

export function WheelTimePicker({ valueMinutes, onCancel, onConfirm, onSelectAnyTime }: WheelTimePickerProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  const initialHour24 = Math.floor(valueMinutes / 60);
  const [hour12, setHour12] = useState(initialHour24 % 12 === 0 ? 12 : initialHour24 % 12);
  const [minute, setMinute] = useState(valueMinutes % 60);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initialHour24 >= 12 ? 'PM' : 'AM');

  const handleConfirm = () => {
    const hour24 = period === 'AM' ? hour12 % 12 : (hour12 % 12) + 12;
    onConfirm(hour24 * 60 + minute);
  };

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.title, { fontFamily: font.bold, color: palette.text }]}>{t('selectTime')}</Text>

      <View style={styles.wheelsRow}>
        <WheelColumn values={HOUR_VALUES} selectedValue={hour12} onSelect={setHour12} format={twoDigits} accent />
        <Text style={{ fontFamily: font.bold, fontSize: 20, color: palette.textDim }}>:</Text>
        <WheelColumn values={MINUTE_VALUES} selectedValue={minute} onSelect={setMinute} format={twoDigits} />

        <View style={styles.periodColumn}>
          {(['AM', 'PM'] as const).map((option) => {
            const selected = period === option;
            return (
              <Pressable
                key={option}
                onPress={() => setPeriod(option)}
                style={[
                  styles.periodBtn,
                  { backgroundColor: selected ? palette.accent : palette.surfaceLow },
                ]}
              >
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: selected ? '#fff' : palette.textDim }}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {onSelectAnyTime ? (
        <Pressable onPress={onSelectAnyTime} style={[styles.anyTimeBtn, { borderColor: palette.border }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: palette.textDim }}>{t('anyTime')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={[styles.actionBtn, { backgroundColor: palette.surfaceLow }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.text }}>{t('cancel')}</Text>
        </Pressable>
        <Pressable onPress={handleConfirm} style={[styles.actionBtn, { backgroundColor: palette.accent }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: '#fff' }}>{t('confirm')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20 },
  title: { fontSize: 17, textAlign: 'center', marginBottom: 12 },
  wheelsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  periodColumn: { marginLeft: 8, gap: 6 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, alignItems: 'center' },
  anyTimeBtn: {
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
});
