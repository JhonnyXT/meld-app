import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';

interface SheetActionsProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled?: boolean;
}

/** Botonera fija al pie de Quick Add/`ItemDetailSheet`: dos botones lado a
 * lado (Cancelar secundario + confirmar en `accent`), fuera del `ScrollView`
 * para que siempre estén a mano aunque el formulario sea largo. */
export function SheetActions({ onCancel, onConfirm, confirmLabel, confirmDisabled }: SheetActionsProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onCancel}
        style={[styles.btn, styles.secondary, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}
        accessibilityRole="button"
      >
        <Icon name="close" size={18} color={palette.text} />
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.text }}>{t('cancel')}</Text>
      </Pressable>
      <Pressable
        onPress={onConfirm}
        disabled={confirmDisabled}
        style={[styles.btn, styles.primary, { backgroundColor: palette.accent, opacity: confirmDisabled ? 0.5 : 1 }]}
        accessibilityRole="button"
      >
        <Icon name="check" size={18} color="#fff" />
        <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 15, color: '#fff', flexShrink: 1 }}>
          {confirmLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingTop: 12 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  secondary: { flex: 1, borderWidth: 1 },
  primary: { flex: 1.6 },
});
