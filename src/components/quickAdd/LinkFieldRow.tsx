import React from 'react';
import { View, TextInput, Pressable, StyleSheet, Linking } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';

interface LinkFieldRowProps {
  value: string;
  onChange: (value: string) => void;
  showBorder?: boolean;
}

/** Campo de URL opcional para Task/Event (Quick Add y detalle). Icono +
 * input inline; si hay un valor, un botón "↗" para abrirlo al toque. El link
 * se muestra después como acción de acceso rápido en la fila de la lista
 * (ver `DayItemRow` → `hasLink`). */
export function LinkFieldRow({ value, onChange, showBorder = true }: LinkFieldRowProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const trimmed = value.trim();

  return (
    <View style={[styles.row, showBorder && { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
      <Icon name="link" size={20} color={palette.textDim} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={t('linkFieldPlaceholder')}
        placeholderTextColor={palette.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        inputMode="url"
        style={[styles.input, { fontFamily: font.regular, color: palette.text }]}
      />
      {trimmed.length > 0 ? (
        <Pressable
          onPress={() => Linking.openURL(trimmed)}
          hitSlop={8}
          style={[styles.openBtn, { backgroundColor: palette.surfaceHigh }]}
          accessibilityRole="button"
          accessibilityLabel={t('a11yOpenLink')}
        >
          <Icon name="north-east" size={14} color={palette.textDim} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  input: { flex: 1, fontSize: 14, padding: 0 },
  openBtn: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
