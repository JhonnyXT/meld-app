import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ListSkeleton } from '@/components/ListSkeleton';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useSheetDragDismiss } from '@/hooks/useSheetDragDismiss';
import { typeColors } from '@/theme/tokens';
import { formatShortDateLabel } from '@/domain/date';
import { DAY_ITEM_TYPE_ICON } from '@/domain/itemTypeIcon';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { useItemDetailStore } from '@/store/itemDetailStore';
import type { Category } from '@/domain/category';
import type { DayItem } from '@/domain/dayItem';

interface CategoryItemsModalProps {
  visible: boolean;
  category: Category | null;
  onClose: () => void;
}

export function CategoryItemsModal({ visible, category, onClose }: CategoryItemsModalProps) {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<DayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { gesture: dragGesture, animatedStyle: dragStyle } = useSheetDragDismiss(visible, onClose);

  useEffect(() => {
    if (!visible || !category) return;
    let cancelled = false;
    setLoading(true);
    dayItemRepository.listByCategory(category.label).then((rows) => {
      if (!cancelled) {
        setItems(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, category]);

  const openItem = (id: string) => {
    onClose();
    useItemDetailStore.getState().open(id);
  };

  if (!category) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <Animated.View
            style={[styles.sheet, { backgroundColor: palette.surface, paddingBottom: insets.bottom + 16 }, dragStyle]}
          >
            <GestureDetector gesture={dragGesture}>
              <View style={styles.handleGrabArea}>
                <View style={[styles.handle, { backgroundColor: palette.surfaceHigh }]} />
              </View>
            </GestureDetector>

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.previewCircle, { backgroundColor: category.color }]}>
                  <Icon name={category.icon} size={20} color="#fff" />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ fontFamily: font.extrabold, fontSize: 20, color: palette.text }} numberOfLines={1}>
                    {category.label}
                  </Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim, marginTop: 2 }}>
                    {t('categoryItemsCount', { count: items.length })}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: palette.surfaceLow }]}
                accessibilityRole="button"
                accessibilityLabel={t('a11yCloseSheet')}
              >
                <Icon name="close" size={20} color={palette.textDim} />
              </Pressable>
            </View>

            {loading ? (
              <View style={{ paddingTop: 4 }}>
                <ListSkeleton variant="rows" count={4} />
              </View>
            ) : items.length === 0 ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIconWell, { backgroundColor: palette.surfaceLow }]}>
                  <Icon name={category.icon} size={24} color={palette.textDim} />
                </View>
                <Text style={{ fontFamily: font.bold, fontSize: 16, color: palette.text, textAlign: 'center' }}>
                  {t('categoryItemsEmptyTitle')}
                </Text>
                <Text
                  style={{
                    fontFamily: font.regular,
                    fontSize: 13,
                    color: palette.textDim,
                    textAlign: 'center',
                    lineHeight: 18,
                    marginTop: 4,
                  }}
                >
                  {t('categoryItemsEmptyMessage')}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                {items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => openItem(item.id)}
                    style={[styles.itemRow, { backgroundColor: palette.surfaceLow }]}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: `${typeColors[item.type]}1A` }]}>
                      <Icon name={DAY_ITEM_TYPE_ICON[item.type]} size={16} color={typeColors[item.type]} />
                    </View>
                    <Text
                      style={{ fontFamily: font.medium, fontSize: 15, color: palette.text, flex: 1 }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={{ fontFamily: font.semibold, fontSize: 12, color: palette.textDim }}>
                      {item.date ? formatShortDateLabel(item.date, lang) : t('inbox')}
                    </Text>
                    <Icon name="chevron-right" size={16} color={palette.textDim} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  handleGrabArea: { paddingTop: 12, paddingBottom: 16, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  previewCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 12, gap: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 12,
  },
  itemIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 12 },
  emptyIconWell: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
});
