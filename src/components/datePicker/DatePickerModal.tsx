import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, Animated, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { MonthCalendarPicker } from './MonthCalendarPicker';
import { toDateKey } from '@/domain/date';

interface DatePickerModalProps {
  visible: boolean;
  /** `null` = Inbox (sin fecha). */
  selectedDateKey: string | null;
  /** Cuando está presente, se muestra un chip "Bandeja" que selecciona `null`. */
  allowInbox?: boolean;
  onCancel: () => void;
  onSelect: (dateKey: string | null) => void;
}

export function DatePickerModal({ visible, selectedDateKey, allowInbox, onCancel, onSelect }: DatePickerModalProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const todayKey = toDateKey(new Date());

  const chips: { key: string | null; label: string }[] = [
    ...(allowInbox ? [{ key: null, label: t('inbox') }] : []),
    { key: todayKey, label: t('today') },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border, transform: [{ scale }] }]}>
          <View style={styles.header}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('selectDate')}</Text>
            <Pressable onPress={onCancel} style={[styles.closeBtn, { backgroundColor: palette.surfaceLow }]} hitSlop={8}>
              <Icon name="close" size={16} color={palette.textDim} />
            </Pressable>
          </View>

          <View style={styles.chipsRow}>
            {chips.map((chip) => {
              const active = chip.key === selectedDateKey;
              return (
                <Pressable
                  key={chip.label}
                  onPress={() => onSelect(chip.key)}
                  style={[styles.chip, { backgroundColor: active ? palette.accent : palette.surfaceLow }]}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: active ? '#fff' : palette.textDim }}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <MonthCalendarPicker selectedDateKey={selectedDateKey} onSelect={onSelect} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: { width: '100%', maxWidth: 380, borderRadius: 24, borderWidth: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
});
