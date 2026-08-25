import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { WheelColumn } from '@/components/timePicker/WheelColumn';

const HOUR_VALUES = Array.from({ length: 5 }, (_, i) => i); // 0-4 h
const MINUTE_VALUES = [0, 15, 30, 45];
const twoDigits = (n: number) => String(n).padStart(2, '0');

interface WheelDurationPickerProps {
  /** Duración total en minutos (no hora del día). */
  valueMinutes: number;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
}

/** Wheel-picker de DURACIÓN (horas 0-4 + minutos en pasos de 15) — mismo
 * patrón visual que `WheelTimePicker`, pero sin AM/PM porque no representa
 * una hora del día sino un lapso. Reemplaza el ciclo de presets fijos del
 * campo Duración de Event en Quick Add / ItemDetailSheet. */
export function WheelDurationPicker({ valueMinutes, onCancel, onConfirm }: WheelDurationPickerProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  const [hours, setHours] = useState(Math.min(4, Math.floor(valueMinutes / 60)));
  const [minutes, setMinutes] = useState(roundToNearestStep(valueMinutes % 60));

  const handleConfirm = () => {
    const total = hours * 60 + minutes;
    onConfirm(total === 0 ? 15 : total);
  };

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.title, { fontFamily: font.bold, color: palette.text }]}>{t('selectDuration')}</Text>

      <View style={styles.wheelsRow}>
        <WheelColumn values={HOUR_VALUES} selectedValue={hours} onSelect={setHours} format={twoDigits} accent />
        <Text style={{ fontFamily: font.bold, fontSize: 20, color: palette.textDim }}>:</Text>
        <WheelColumn values={MINUTE_VALUES} selectedValue={minutes} onSelect={setMinutes} format={twoDigits} />
      </View>

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

function roundToNearestStep(minutes: number): number {
  return MINUTE_VALUES.reduce((closest, v) => (Math.abs(v - minutes) < Math.abs(closest - minutes) ? v : closest));
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1, paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20 },
  title: { fontSize: 17, textAlign: 'center', marginBottom: 12 },
  wheelsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
});
