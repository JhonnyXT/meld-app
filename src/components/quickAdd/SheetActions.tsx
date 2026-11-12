import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/domain/iconNames';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';

interface SheetActionsProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled?: boolean;
  /** Reemplaza el botón "Cancelar" por una acción real — usado por `ItemDetailSheet` en
   * Tarea/Hábito para "Marcar completada/hecho" en vez de solo cerrar (pedido explícito del
   * usuario: la "X" del header ya cierra sin guardar, así que "Cancelar" ahí era redundante).
   * Sin `onSecondary`, el botón sigue siendo "Cancelar" (comportamiento de siempre). */
  secondaryLabel?: string;
  secondaryIcon?: IconName;
  onSecondary?: () => void;
  /** Tinta el botón secundario en `accent` — indica que el ítem YA está marcado (toggle, no una
   * acción de un solo sentido). */
  secondaryActive?: boolean;
}

/** Botonera fija al pie de Quick Add/`ItemDetailSheet`: dos botones lado a
 * lado (secundario + confirmar en `accent`), fuera del `ScrollView`
 * para que siempre estén a mano aunque el formulario sea largo. */
export function SheetActions({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmDisabled,
  secondaryLabel,
  secondaryIcon,
  onSecondary,
  secondaryActive,
}: SheetActionsProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onSecondary ?? onCancel}
        style={[
          styles.btn,
          styles.secondary,
          {
            backgroundColor: secondaryActive ? `${palette.accent}1A` : palette.surfaceLow,
            borderColor: secondaryActive ? palette.accent : palette.border,
          },
        ]}
        accessibilityRole="button"
      >
        <Icon name={onSecondary ? (secondaryIcon ?? 'check') : 'close'} size={18} color={secondaryActive ? palette.accent : palette.text} />
        <Text
          numberOfLines={1}
          style={{ fontFamily: font.semibold, fontSize: 15, color: secondaryActive ? palette.accent : palette.text, flexShrink: 1 }}
        >
          {onSecondary ? secondaryLabel : t('cancel')}
        </Text>
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
