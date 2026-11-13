import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useCategoriesStore } from '@/store/categoriesStore';
import { ACCORDION_LAYOUT, ACCORDION_ENTER, ACCORDION_EXIT } from './accordionMotion';

const MAX_WRAPPED_CATEGORIES = 3;

interface CategoryChipsProps {
  value: string | null;
  onChange: (label: string, color: string) => void;
  showBorder?: boolean;
}

// ver docs/adr/0012-divisor-categorychips-un-solo-lugar.md
export function CategoryChips({ value, onChange, showBorder }: CategoryChipsProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const categoryList = useCategoriesStore((s) => s.categories);
  const readOnlyLabels = useCategoriesStore((s) => s.readOnlyLabels);
  const loaded = useCategoriesStore((s) => s.loaded);
  const selected = categoryList.find((cat) => cat.label === value);
  const selectableCategories = categoryList.filter((cat) => !readOnlyLabels.has(cat.label));
  const scrollable = selectableCategories.length > MAX_WRAPPED_CATEGORIES;

  const chips = selectableCategories.map((cat) => {
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
  });

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
          {scrollable ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.scroller}
              contentContainerStyle={styles.scrollRow}
            >
              {chips}
            </ScrollView>
          ) : (
            <View style={styles.row}>
              {selectableCategories.length === 0 ? (
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim }}>
                  {t('categoriesEmptyMessage')}
                </Text>
              ) : null}
              {chips}
            </View>
          )}
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
  scroller: { marginHorizontal: -16 },
  scrollRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
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
