import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useSheetDragDismiss } from '@/hooks/useSheetDragDismiss';
import { typeColors } from '@/theme/tokens';
import { DAY_ITEM_TYPE_ICON } from '@/domain/itemTypeIcon';
import { formatLongDate } from '@/domain/date';
import { useItemDetailStore } from '@/store/itemDetailStore';
import type { DayItem } from '@/domain/dayItem';

interface DayItemsModalProps {
  visible: boolean;
  date: Date | null;
  items: DayItem[];
  onClose: () => void;
}

function chipColor(item: DayItem): string {
  return item.categoryColor ?? typeColors[item.type];
}

export function DayItemsModal({ visible, date, items, onClose }: DayItemsModalProps) {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gesture: dragGesture, animatedStyle: dragStyle } = useSheetDragDismiss(visible, onClose);

  const openItem = (id: string) => {
    onClose();
    useItemDetailStore.getState().open(id);
  };

  if (!date) return null;

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
              <View style={{ flexShrink: 1 }}>
                <Text
                  style={{ fontFamily: font.extrabold, fontSize: 19, color: palette.text, textTransform: 'capitalize' }}
                  numberOfLines={1}
                >
                  {formatLongDate(date, lang)}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim, marginTop: 2 }}>
                  {t('categoryItemsCount', { count: items.length })}
                </Text>
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {items.map((item) => {
                const color = chipColor(item);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => openItem(item.id)}
                    style={[styles.itemRow, { backgroundColor: palette.surfaceLow }]}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: `${color}26` }]}>
                      <Icon name={DAY_ITEM_TYPE_ICON[item.type]} size={16} color={color} />
                    </View>
                    <Text
                      style={{ fontFamily: font.medium, fontSize: 15, color: palette.text, flex: 1 }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Icon name="chevron-right" size={16} color={palette.textDim} />
                  </Pressable>
                );
              })}
            </ScrollView>
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
});
