import React, { useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { presetLabel } from '@/domain/quickAdd';
import type { Language } from '@/i18n';
import { FieldRow } from './FieldRow';
import { ACCORDION_LAYOUT, ACCORDION_ENTER, ACCORDION_EXIT } from './accordionMotion';

interface PresetFieldRowProps {
  icon: IconName;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  lang: Language;
  showBorder?: boolean;
}

/** Fila icono + etiqueta + valor que, al tocarla, expande un acordeón inline
 * con la lista completa de presets — reemplaza el ciclo "tocar avanza al
 * siguiente valor" por selección directa. */
export function PresetFieldRow({ icon, label, options, value, onChange, lang, showBorder = true }: PresetFieldRowProps) {
  const { palette, font } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View layout={ACCORDION_LAYOUT}>
      <FieldRow
        icon={icon}
        label={label}
        value={presetLabel(value, lang)}
        onPress={() => setExpanded((e) => !e)}
        showBorder={expanded || showBorder}
        expanded={expanded}
      />
      {expanded && (
        <Animated.View entering={ACCORDION_ENTER} exiting={ACCORDION_EXIT} style={styles.optionsList}>
          {options.map((option, index) => {
            const selected = option === value;
            const isLast = index === options.length - 1;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  onChange(option);
                  setExpanded(false);
                }}
                style={[styles.optionRow, !(isLast && !showBorder) && { borderBottomWidth: 1, borderBottomColor: palette.border }]}
              >
                <Text
                  style={{
                    fontFamily: selected ? font.medium : font.regular,
                    fontSize: 14,
                    color: selected ? palette.accent : palette.textDim,
                  }}
                >
                  {presetLabel(option, lang)}
                </Text>
                {selected && <Icon name="check" size={18} color={palette.accent} />}
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  optionsList: { paddingLeft: 32 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingRight: 4 },
});
