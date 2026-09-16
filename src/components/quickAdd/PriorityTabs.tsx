import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { PRIORITY_OPTIONS } from '@/domain/quickAdd';
import type { PriorityLevel } from '@/domain/dayItem';
import { ACCORDION_LAYOUT, ACCORDION_ENTER, ACCORDION_EXIT } from './accordionMotion';

interface PriorityTabsProps {
  value: PriorityLevel;
  onChange: (value: PriorityLevel) => void;
}

/** Fila-acordeón — colapsada por default, muestra la prioridad elegida +
 * chevron; tocarla expande los tabs debajo. Mismo patrón que
 * `PresetFieldRow`/`CategoryChips` (pedido explícito del usuario, 2026-08-26,
 * para no ocupar espacio permanente en Quick Add/`ItemDetailSheet`). */
export function PriorityTabs({ value, onChange }: PriorityTabsProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const selected = PRIORITY_OPTIONS.find((opt) => opt.id === value);

  return (
    <Animated.View layout={ACCORDION_LAYOUT}>
      <Pressable onPress={() => setExpanded((e) => !e)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="flag" size={20} color={palette.textDim} />
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: palette.text }}>{t('fieldPriority')}</Text>
        </View>
        <View style={styles.headerRight}>
          {selected && <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim }}>{t(selected.labelKey)}</Text>}
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textDim} />
        </View>
      </Pressable>
      {expanded && (
        <Animated.View
          entering={ACCORDION_ENTER}
          exiting={ACCORDION_EXIT}
          style={[styles.track, { backgroundColor: palette.bg, borderColor: palette.border }]}
        >
          {PRIORITY_OPTIONS.map((opt) => {
            const active = opt.id === value;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  onChange(opt.id);
                  setExpanded(false);
                }}
                style={[styles.tab, active && { backgroundColor: palette.accent }]}
              >
                <Icon name="flag" size={12} color={active ? '#fff' : opt.color} />
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: active ? '#fff' : palette.textDim }}>
                  {t(opt.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  track: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4, borderWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
});
