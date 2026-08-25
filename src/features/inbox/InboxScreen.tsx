import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Icon } from '@/components/Icon';
import { InboxItemRow } from '@/components/dayItem/InboxItemRow';
import { FloatingBar } from '@/components/FloatingBar';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useInboxStore } from '@/store/inboxStore';
import { useQuickAddStore } from '@/store/quickAddStore';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { useItemDetailStore } from '@/store/itemDetailStore';
import { toInboxRowViewModel, type InboxRowViewModel } from './mapInboxItemToRow';

export function InboxScreen() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const items = useInboxStore((s) => s.items);
  const reload = useInboxStore((s) => s.reload);
  const [captureText, setCaptureText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const rows = useMemo(() => items.map((item) => toInboxRowViewModel(item, lang)), [items, lang]);

  const submitCapture = () => {
    if (!captureText.trim()) return;
    useInboxStore.getState().create(captureText);
    setCaptureText('');
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = () => {
    useInboxStore.getState().bulkRemove(Array.from(selectedIds));
    cancelSelection();
  };

  const handleBulkScheduleToday = () => {
    useInboxStore.getState().bulkScheduleToday(Array.from(selectedIds));
    cancelSelection();
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScreenHeader
        style={{ paddingHorizontal: 16 }}
        title={
          selectionMode ? (
            <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: palette.text }}>
              {t('selectedCount', { count: selectedIds.size })}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: palette.text }}>
                {t('inbox')}
              </Text>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.textDim }}>{items.length}</Text>
            </View>
          )
        }
        right={
          selectionMode ? (
            <Pressable
              onPress={cancelSelection}
              accessibilityRole="button"
              accessibilityLabel={t('cancel')}
              style={[styles.gridButton, { backgroundColor: palette.surfaceLow }]}
            >
              <Icon name="close" size={18} color={palette.textDim} />
            </Pressable>
          ) : (
            <View style={[styles.gridButton, { backgroundColor: palette.surfaceLow }]}>
              <Icon name="view-grid" size={18} color={palette.textDim} />
            </View>
          )
        }
      />

      <View style={{ paddingHorizontal: 16 }}>
        <View style={[styles.captureRow, { backgroundColor: palette.surfaceLow }]}>
          <Icon name="add" size={18} color={palette.textDim} />
          <TextInput
            value={captureText}
            onChangeText={setCaptureText}
            onSubmitEditing={submitCapture}
            placeholder={t('inboxQuickCapturePlaceholder')}
            placeholderTextColor={palette.textDim}
            style={[styles.captureInput, { fontFamily: font.medium, color: palette.text }]}
            returnKeyType="done"
          />
          {captureText.trim().length > 0 ? (
            <Pressable onPress={submitCapture} style={[styles.captureSubmit, { backgroundColor: palette.accent }]}>
              <Icon name="chevron-up" size={18} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlashList<InboxRowViewModel>
        style={{ flex: 1, marginTop: 16 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        data={rows}
        keyExtractor={(row) => row.id}
        extraData={selectionMode ? selectedIds : selectionMode}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<EmptyState icon="inbox" title={t('inboxEmptyTitle')} message={t('inboxEmptyMessage')} />}
        renderItem={({ item: row }) => (
          <InboxItemRow
            item={row}
            selectionMode={selectionMode}
            selected={selectedIds.has(row.id)}
            onPress={() => (selectionMode ? toggleSelected(row.id) : useItemDetailStore.getState().open(row.id))}
            onLongPress={() => toggleSelected(row.id)}
            onDelete={() => useInboxStore.getState().remove(row.id)}
            onScheduleToday={() => useInboxStore.getState().scheduleToday(row.id)}
          />
        )}
      />

      <FloatingBar
        fabSize={48}
        onAddPress={selectionMode ? handleBulkDelete : () => useQuickAddStore.getState().open('task')}
        onMenuPress={selectionMode ? cancelSelection : () => useNavigateMenuStore.getState().open()}
        fabIcon={selectionMode ? 'delete-outline' : 'add'}
        fabColor={selectionMode ? palette.danger : undefined}
        fabLabel={selectionMode ? t('a11yDeleteItem') : undefined}
        menuIcon={selectionMode ? 'close' : 'menu'}
        menuLabel={selectionMode ? t('cancel') : undefined}
        center={
          selectionMode ? (
            <Pressable
              onPress={handleBulkScheduleToday}
              style={[styles.pill, { backgroundColor: palette.pillSolid, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
            >
              <Icon name="check" size={18} color={palette.text} />
              <Text style={{ fontFamily: font.bold, fontSize: 15, color: palette.text }}>{t('scheduleSelectedToday')}</Text>
            </Pressable>
          ) : (
            <View style={[styles.pill, { backgroundColor: palette.pillSolid }]}>
              <Text style={{ fontFamily: font.bold, fontSize: 16, color: palette.text }}>{t('inbox')}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 10, color: palette.textDim }}>
                {t('waiting', { count: items.length })}
              </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gridButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginTop: 16,
  },
  captureInput: { flex: 1, fontSize: 16, padding: 0 },
  captureSubmit: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
