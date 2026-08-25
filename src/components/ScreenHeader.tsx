import React, { type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface ScreenHeaderProps {
  /** Línea principal (el título) — se alinea en la MISMA fila que `right`,
   * ambos con `alignItems: 'center'`, para que los botones queden centrados
   * contra el título en vez de contra el bloque título+subtítulo completo
   * (ese era el bug: con subtítulo debajo, alinear el bloque entero por
   * arriba dejaba los botones más abajo que el título, por el `lineHeight`
   * extra del título grande). */
  title: ReactNode;
  /** Línea secundaria opcional, debajo, a todo el ancho — no participa de la
   * alineación con `right`. */
  subtitle?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Encabezado compartido por las pantallas principales (Today, Calendario,
 * Bandeja, Ajustes). Patrón portado de `habit-tracker`, adaptado para
 * garantizar la alineación exacta entre título y botones sin depender de
 * que ambos bloques midan lo mismo. */
export function ScreenHeader({ title, subtitle, right, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>{title}</View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {subtitle ? <View style={styles.subtitle}>{subtitle}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 20, paddingBottom: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleLeft: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  subtitle: { marginTop: 4 },
});
