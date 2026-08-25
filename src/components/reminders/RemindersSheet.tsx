import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useRemindersStore } from '@/store/remindersStore';
import { useItemDetailStore } from '@/store/itemDetailStore';
import { ICON_BY_TYPE } from '@/features/inbox/mapInboxItemToRow';
import { formatShortDateLabel } from '@/domain/date';
import { minutesToLabel, hour24ToMinutes, ANY_TIME_HHMM } from '@/domain/time';
import type { DayItem } from '@/domain/dayItem';

function trailingLabel(item: DayItem, lang: 'es' | 'en', anyTimeLabel: string): string {
  const dateLabel = item.date ? formatShortDateLabel(item.date, lang) : '';
  const hhmm = item.reminderAt!.slice(11, 16);
  const timeLabel = hhmm === ANY_TIME_HHMM ? anyTimeLabel : minutesToLabel(hour24ToMinutes(hhmm));
  return dateLabel ? `${dateLabel} · ${timeLabel}` : timeLabel;
}

export function RemindersSheet() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const visible = useRemindersStore((s) => s.visible);
  const items = useRemindersStore((s) => s.items);
  const loading = useRemindersStore((s) => s.loading);
  const close = useRemindersStore((s) => s.close);

  const openResult = (id: string) => {
    close();
    useItemDetailStore.getState().open(id);
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={close}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(220).springify().damping(22).mass(0.7)}
        exiting={SlideOutDown.duration(180)}
        style={[styles.wrap, { bottom: Math.max(insets.bottom, 16) }]}
        pointerEvents="box-none"
      >
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.header}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('remindersTitle')}</Text>
            <Pressable onPress={close} style={[styles.closeButton, { backgroundColor: palette.surfaceLow }]}>
              <Icon name="close" size={18} color={palette.textDim} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {!loading && items.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="schedule" size={26} color={palette.textDim} />
                <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim, marginTop: 12, textAlign: 'center' }}>
                  {t('remindersEmpty')}
                </Text>
              </View>
            ) : (
              items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openResult(item.id)}
                  style={[styles.row, { backgroundColor: palette.surfaceLow }]}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconRing, { borderColor: palette.border }]}>
                      <Icon name={ICON_BY_TYPE[item.type]} size={16} color={palette.textDim} />
                    </View>
                    <Text numberOfLines={1} style={[styles.rowTitle, { fontFamily: font.medium, color: palette.text }]}>
                      {item.title}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: font.semibold, fontSize: 12, color: palette.accent }}>
                    {trailingLabel(item, lang, t('anyTime'))}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  wrap: { position: 'absolute', left: 16, right: 16, top: 80 },
  card: {
    width: '100%',
    maxHeight: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  closeButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 12 },
  row: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  iconRing: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, flexShrink: 1, marginRight: 8 },
});
