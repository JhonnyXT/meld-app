import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

interface SettingRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showBorder?: boolean;
  onPress?: () => void;
}

export function SettingRow({ icon, title, subtitle, right, showBorder, onPress }: SettingRowProps) {
  const { palette, font } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, showBorder && { borderBottomWidth: 1, borderBottomColor: palette.border }]}
    >
      <View style={styles.left}>
        <View style={[styles.iconCircle, { backgroundColor: palette.surfaceHigh }]}>
          <Icon name={icon} size={18} color={palette.textDim} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={{ fontFamily: font.medium, fontSize: 17, color: palette.text }}>{title}</Text>
          {subtitle ? (
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim, marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 1 },
  // Sin `flexShrink`, esta columna (título+subtítulo) ignora el ancho
  // disponible y se dibuja a su ancho de contenido completo, superponiéndose
  // con `right` (p. ej. el switch de "Hábitos Cool", con un subtítulo largo
  // de 2 líneas) en vez de ajustar dónde hace wrap — bug real visto en
  // dispositivo, no reintroducir.
  titleBlock: { flexShrink: 1 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
