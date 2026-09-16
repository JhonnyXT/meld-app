import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation, type TranslationKey } from '@/i18n';
import { accentPalette, type AccentId } from '@/theme/tokens';
import { ACCORDION_LAYOUT, ACCORDION_ENTER, ACCORDION_EXIT } from '@/components/quickAdd/accordionMotion';

const ACCENT_LABEL_KEY: Record<AccentId, TranslationKey> = {
  coral: 'accentCoral',
  orange: 'accentOrange',
  yellow: 'accentYellow',
  green: 'accentGreen',
  blue: 'accentBlue',
  purple: 'accentPurple',
};

interface AccentColorRowProps {
  value: AccentId;
  onChange: (value: AccentId) => void;
}

/** Fila-acordeón de Settings para elegir el color de acento del tema —
 * mismo patrón de acordeón inline que `CategoryChips`/`PriorityTabs` en
 * Quick Add (colapsado por default, header tocable con el valor actual +
 * chevron, swatches debajo al expandir). `accentPalette`/`AccentId` ya
 * existían en `theme/tokens.ts` con efecto real en `ThemeProvider` — a esto
 * solo le faltaba una UI para elegirlos. */
export function AccentColorRow({ value, onChange }: AccentColorRowProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const current = accentPalette.find((a) => a.id === value) ?? accentPalette[0];

  return (
    <Animated.View layout={ACCORDION_LAYOUT}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={[styles.header, !expanded && { borderBottomWidth: 1, borderBottomColor: palette.border }]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: palette.surfaceHigh }]}>
            <Icon name="palette" size={18} color={palette.textDim} />
          </View>
          <Text style={{ fontFamily: font.medium, fontSize: 17, color: palette.text }}>{t('settingsAccentColor')}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.dot, { backgroundColor: current.value }]} />
          <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>{t(ACCENT_LABEL_KEY[current.id])}</Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textDim} />
        </View>
      </Pressable>
      {expanded && (
        <Animated.View
          entering={ACCORDION_ENTER}
          exiting={ACCORDION_EXIT}
          style={[styles.swatchRow, { borderBottomWidth: 1, borderBottomColor: palette.border }]}
        >
          {accentPalette.map((a) => {
            const active = a.id === value;
            return (
              <Pressable
                key={a.id}
                onPress={() => onChange(a.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t(ACCENT_LABEL_KEY[a.id])}
                style={[
                  styles.swatch,
                  { backgroundColor: a.value },
                  active && { borderColor: palette.text, borderWidth: 2 },
                ]}
              >
                {active ? <Icon name="check" size={14} color="#fff" /> : null}
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  swatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
