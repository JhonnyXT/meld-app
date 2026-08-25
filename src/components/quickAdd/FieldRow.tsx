import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

interface FieldRowProps {
  icon: IconName;
  label: string;
  value: string;
  onPress: () => void;
  showBorder?: boolean;
  /** Cuando está presente, muestra un chevron que indica si la fila puede
   * expandirse (ver `PresetFieldRow`) — undefined omite el chevron. */
  expanded?: boolean;
  /** Cuando está presente, muestra un botón "x" para volver el campo a su
   * estado apagado/sin valor (ver `TimeFieldRow`) — solo debe pasarse cuando
   * el campo tiene actualmente un valor que tenga sentido borrar. */
  onClear?: () => void;
}

/** Fila icono + etiqueta + valor; tocar el valor lo cicla al siguiente preset. */
export function FieldRow({ icon, label, value, onPress, showBorder = true, expanded, onClear }: FieldRowProps) {
  const { palette, font } = useTheme();

  return (
    <Pressable onPress={onPress} style={[styles.row, showBorder && { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
      <View style={styles.left}>
        <Icon name={icon} size={20} color={palette.textDim} />
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: palette.text }}>{label}</Text>
      </View>
      <View style={styles.right}>
        <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim }}>{value}</Text>
        {onClear && (
          <Pressable onPress={onClear} hitSlop={8} style={styles.clearBtn}>
            <Icon name="close" size={14} color={palette.textDim} />
          </Pressable>
        )}
        {expanded !== undefined && (
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textDim} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  clearBtn: { padding: 2, marginLeft: 4 },
});
