import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useCategoriesStore } from '@/store/categoriesStore';
import { ACCORDION_LAYOUT, ACCORDION_ENTER, ACCORDION_EXIT } from './accordionMotion';

interface CategoryChipsProps {
  value: string | null;
  onChange: (label: string, color: string) => void;
  /** Cuando es `true`, agrega un divisor debajo (mismo patrón que las filas de
   * campo) para separar visualmente de la sección siguiente (p. ej. Prioridad). */
  showBorder?: boolean;
}

/** Fila-acordeón — colapsada por default, muestra la categoría elegida (nada
 * si ninguna) + chevron; tocarla expande los chips debajo. Mismo patrón que
 * `PresetFieldRow` (acordeón inline), aplicado acá para no ocupar espacio
 * permanente en Quick Add/`ItemDetailSheet` con algo que se usa poco (pedido
 * explícito del usuario, 2026-08-26). El divisor va en el header cuando está
 * colapsado, y se mueve al pie de los chips cuando está expandido — nunca en
 * los dos lugares a la vez, o el espacio antes de Prioridad queda doble
 * (bug real reportado el mismo día, no reintroducirlo). */
export function CategoryChips({ value, onChange, showBorder }: CategoryChipsProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const categoryList = useCategoriesStore((s) => s.categories);
  const loaded = useCategoriesStore((s) => s.loaded);
  const selected = categoryList.find((cat) => cat.label === value);

  useEffect(() => {
    if (!loaded) useCategoriesStore.getState().load();
  }, [loaded]);

  return (
    <Animated.View layout={ACCORDION_LAYOUT}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={[styles.header, !expanded && showBorder && { borderBottomWidth: 1, borderBottomColor: palette.border }]}
      >
        <View style={styles.headerLeft}>
          <Icon name="folder" size={20} color={palette.textDim} />
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: palette.text }}>{t('fieldCategory')}</Text>
        </View>
        <View style={styles.headerRight}>
          {selected && (
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim }}>{selected.label}</Text>
          )}
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textDim} />
        </View>
      </Pressable>
      {expanded && (
        <Animated.View
          entering={ACCORDION_ENTER}
          exiting={ACCORDION_EXIT}
          style={[styles.rowWrap, showBorder && { paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: palette.border }]}
        >
          <View style={styles.row}>
            {categoryList.length === 0 ? (
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim }}>
                {t('categoriesEmptyMessage')}
              </Text>
            ) : null}
            {categoryList.map((cat) => {
              const active = cat.label === value;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    onChange(cat.label, cat.color);
                    setExpanded(false);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? palette.accent : 'transparent',
                      borderColor: active ? palette.accent : palette.border,
                    },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: active ? '#fff' : cat.color }]} />
                  <Text style={{ fontFamily: font.medium, fontSize: 13, color: active ? '#fff' : palette.text }}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rowWrap: { paddingTop: 2 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
