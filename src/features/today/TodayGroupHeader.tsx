import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

interface TodayGroupHeaderProps {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}

/** Encabezado de cada sección de la lista de Today cuando está agrupada por
 * tipo (toggle del ícono de filtro del header — ver `TodayScreen`). Etiqueta +
 * conteo a la izquierda, línea divisoria de guiones que ocupa el resto del
 * ancho, y un chevron a la derecha para desplegar/ocultar esa sección. Toda
 * la fila es tocable. */
export function TodayGroupHeader({ label, count, collapsed, onToggle }: TodayGroupHeaderProps) {
  const { palette, font } = useTheme();
  return (
    <Pressable onPress={onToggle} style={styles.row} hitSlop={6} accessibilityRole="button">
      <Text style={[styles.label, { fontFamily: font.semibold, color: palette.text }]}>{label}</Text>
      <Text style={[styles.count, { fontFamily: font.medium, color: palette.textDim }]}>{count}</Text>
      <View style={[styles.rule, { borderColor: palette.border }]} />
      <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={20} color={palette.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 2 },
  label: { fontSize: 13, letterSpacing: 0.3 },
  count: { fontSize: 13 },
  rule: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed', marginHorizontal: 4, height: 0 },
});
