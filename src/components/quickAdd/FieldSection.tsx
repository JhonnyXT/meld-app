import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** Card de un grupo de campos en Quick Add/`ItemDetailSheet` (Cuándo,
 * Organizar, Link, Grabación). Las filas de adentro se separan solo por sus
 * líneas divisorias; la ÚLTIMA fila de cada sección va con
 * `showBorder={false}` para que la línea no choque con el borde de la card. */
export function FieldSection({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  return <View style={[styles.card, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, marginBottom: 12, overflow: 'hidden' },
});
