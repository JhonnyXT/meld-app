import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useCalendarFilterStore } from '@/store/calendarFilterStore';
import { dayItemRepository } from '@/data/local/dayItemRepository';

const TYPE_ROWS: { itemType: 'task' | 'event' | 'note' | 'voiceMemo' | 'moment'; icon: IconName; labelKey: 'filterTasks' | 'filterEvents' | 'filterNotes' | 'filterVoiceNotes' | 'filterMoments' }[] = [
  { itemType: 'task', icon: 'description', labelKey: 'filterTasks' },
  { itemType: 'event', icon: 'event', labelKey: 'filterEvents' },
  { itemType: 'note', icon: 'sticky-note-2', labelKey: 'filterNotes' },
  { itemType: 'voiceMemo', icon: 'graphic-eq', labelKey: 'filterVoiceNotes' },
  { itemType: 'moment', icon: 'photo-camera', labelKey: 'filterMoments' },
];

export function CalendarFilterSheet() {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const visible = useCalendarFilterStore((s) => s.sheetVisible);
  const filter = useCalendarFilterStore((s) => s.filter);
  const setFilter = useCalendarFilterStore((s) => s.setFilter);
  const close = useCalendarFilterStore((s) => s.closeSheet);
  const insets = useSafeAreaInsets();
  const [habitTitles, setHabitTitles] = useState<string[]>([]);

  useEffect(() => {
    if (visible) dayItemRepository.listDistinctHabitTitles().then(setHabitTitles);
  }, [visible]);

  const row = (icon: IconName, label: string, active: boolean, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        <Icon name={icon} size={18} color={palette.textDim} />
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: palette.text }}>{label}</Text>
      </View>
      {active ? <Icon name="check" size={18} color={palette.accent} /> : null}
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.header}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('filterLabel')}</Text>
            <Pressable onPress={close} style={[styles.closeButton, { backgroundColor: palette.surfaceLow }]}>
              <Icon name="close" size={18} color={palette.textDim} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {row('filter-list', t('filterEverything'), filter.kind === 'everything', () => setFilter({ kind: 'everything' }))}
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            {TYPE_ROWS.map((opt) =>
              row(opt.icon, t(opt.labelKey), filter.kind === 'type' && filter.itemType === opt.itemType, () =>
                setFilter({ kind: 'type', itemType: opt.itemType }),
              ),
            )}
            {habitTitles.length > 0 ? (
              <>
                <View style={[styles.divider, { backgroundColor: palette.border }]} />
                <Text style={[styles.sectionLabel, { fontFamily: font.semibold, color: palette.textDim }]}>
                  {t('filterHabitsSection')}
                </Text>
                {habitTitles.map((title) =>
                  row('sync-alt', title, filter.kind === 'habit' && filter.title === title, () => setFilter({ kind: 'habit', title })),
                )}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  wrap: { position: 'absolute', left: 16, right: 16, top: 100 },
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  closeButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  list: {},
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: 1, marginVertical: 4, opacity: 0.6 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.5, paddingTop: 8, paddingBottom: 4 },
});
