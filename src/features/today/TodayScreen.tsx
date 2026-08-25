import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { AuraBackground } from '@/components/AuraBackground';
import { TopAppBar } from '@/components/TopAppBar';
import { DayBar } from '@/components/DayBar';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/EmptyState';
import { TodayItemRow } from './TodayItemRow';
import { sortWithHealthHabitsLast } from './mapDayItemToRow';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useDayItemsStore } from '@/store/dayItemsStore';
import { useInboxStore } from '@/store/inboxStore';
import { useQuickAddStore } from '@/store/quickAddStore';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { useSearchStore } from '@/store/searchStore';
import { useRemindersStore } from '@/store/remindersStore';
import { useItemDetailStore } from '@/store/itemDetailStore';
import { ICON_BY_TYPE } from '@/features/inbox/mapInboxItemToRow';
import { seedIfEmpty } from '@/data/local/seed';
import { formatHeaderDate, formatDayBarDate, formatShortDateLabel, addDays } from '@/domain/date';

const ROW_TRANSITION = LinearTransition.duration(220);

export function TodayScreen() {
  const { palette, font, scheme } = useTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const items = useDayItemsStore((s) => s.items);
  const habitCompletedMap = useDayItemsStore((s) => s.habitCompletedMap);
  const setStoreDate = useDayItemsStore((s) => s.setSelectedDate);
  const reload = useDayItemsStore((s) => s.reload);
  const toggleComplete = useDayItemsStore((s) => s.toggleComplete);
  const toggleHabitComplete = useDayItemsStore((s) => s.toggleHabitComplete);
  const inboxCount = useInboxStore((s) => s.items.length);
  const reloadInbox = useInboxStore((s) => s.reload);

  const searchActive = useSearchStore((s) => s.active);
  const searchQuery = useSearchStore((s) => s.query);
  const searchResults = useSearchStore((s) => s.results);
  const setSearchQuery = useSearchStore((s) => s.setQuery);
  const submitSearch = useSearchStore((s) => s.submit);
  const closeSearch = useSearchStore((s) => s.close);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    seedIfEmpty().then(() => {
      setStoreDate(selectedDate);
      reloadInbox();
    });
  }, []);

  useEffect(() => {
    setStoreDate(selectedDate);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      reload();
      reloadInbox();
    }, [reload, reloadInbox]),
  );

  useEffect(() => {
    if (searchActive) {
      const timeout = setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => clearTimeout(timeout);
    }
  }, [searchActive]);

  // Un hábito nunca cambia `status` al completarse (eso vive aparte, en
  // `habitCompletedMap` — ver `dayItemsStore.toggleHabitComplete`), así que
  // el conteo "X de Y hechos" de `DayBar` necesita leerlo distinto para no
  // mostrar hábitos recurrentes como perpetuamente "no hechos".
  const doneCount = items.filter((i) => (i.type === 'habit' ? habitCompletedMap[i.id] : i.status === 'done')).length;
  const isFiltering = searchActive && searchResults !== null;
  // Una task completada, o un hábito "de salud" marcado hecho ese día,
  // desaparecen de la lista (con animación de salida) pero el registro sigue
  // en la DB tal cual — Calendar sigue viéndolo (el heatmap de Año lee
  // `habit_completions` directo, sin importar si Today lo muestra u oculta).
  // Los hábitos manuales NO desaparecen al completarse — a propósito, solo
  // Task y hábitos de salud tienen este comportamiento. Ver CLAUDE.md →
  // "Completar una task (desaparece de la lista)".
  const visibleRows = isFiltering
    ? searchResults
    : sortWithHealthHabitsLast(
        items.filter(
          (i) =>
            !(i.type === 'task' && i.status === 'done') &&
            !(i.type === 'habit' && i.colorStyle === 'cool' && habitCompletedMap[i.id]),
        ),
      );

  return (
    <Screen style={{ paddingHorizontal: 0 }} background={scheme === 'dark' ? <AuraBackground /> : undefined}>
      <View style={{ paddingHorizontal: 16 }}>
        <TopAppBar
          title={t('today')}
          subtitle={formatHeaderDate(selectedDate, lang)}
          inboxCount={inboxCount}
          onHistoryPress={() => useRemindersStore.getState().open()}
          onInboxPress={() => router.push('/inbox')}
        />
        {searchActive ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(140)}
            layout={ROW_TRANSITION}
            style={styles.searchBarRow}
          >
            <View style={[styles.searchPill, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
              <Icon name="search" size={16} color={palette.textDim} />
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={submitSearch}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={palette.textDim}
                style={[styles.searchInput, { fontFamily: font.medium, color: palette.text }]}
                returnKeyType="search"
              />
            </View>
            <Pressable onPress={closeSearch} hitSlop={8} style={[styles.closeCircle, { backgroundColor: palette.surfaceLow }]}>
              <Icon name="close" size={18} color={palette.textDim} />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.list, { paddingHorizontal: 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isFiltering && searchResults.length === 0 ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.emptyState}>
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim, textAlign: 'center' }}>
              {t('searchNoResults', { query: searchQuery })}
            </Text>
          </Animated.View>
        ) : !isFiltering && visibleRows.length === 0 ? (
          <EmptyState icon="calendar-today" title={t('todayEmptyTitle')} message={t('todayEmptyMessage')} />
        ) : (
          visibleRows.map((item) =>
            isFiltering ? (
              <Animated.View key={item.id} layout={ROW_TRANSITION} entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
                <Pressable
                  onPress={() => {
                    closeSearch();
                    useItemDetailStore.getState().open(item.id);
                  }}
                  style={[styles.searchRow, { backgroundColor: palette.surfaceLow }]}
                >
                  <View style={styles.searchRowLeft}>
                    <View style={[styles.searchIconRing, { borderColor: palette.border }]}>
                      <Icon name={ICON_BY_TYPE[item.type]} size={16} color={palette.textDim} />
                    </View>
                    <Text numberOfLines={1} style={[styles.searchRowTitle, { fontFamily: font.medium, color: palette.text }]}>
                      {item.title}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: font.semibold, fontSize: 12, color: palette.textDim }}>
                    {item.date ? formatShortDateLabel(item.date, lang) : t('inbox')}
                  </Text>
                </Pressable>
              </Animated.View>
            ) : (
              <Animated.View key={item.id} layout={ROW_TRANSITION} entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
                <TodayItemRow
                  item={item}
                  onToggleComplete={toggleComplete}
                  habitCompletedToday={habitCompletedMap[item.id] ?? false}
                  onToggleHabitComplete={toggleHabitComplete}
                />
              </Animated.View>
            ),
          )
        )}
      </ScrollView>

      <DayBar
        dateLabel={formatDayBarDate(selectedDate, lang)}
        doneLabel={t('doneOfTotal', { done: doneCount, total: items.length })}
        onPrevDay={() => setSelectedDate((d) => addDays(d, -1))}
        onNextDay={() => setSelectedDate((d) => addDays(d, 1))}
        onDatePress={() => setSelectedDate(new Date())}
        onAddPress={() => useQuickAddStore.getState().open('task')}
        onMenuPress={() => useNavigateMenuStore.getState().open()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, gap: 12, paddingTop: 8, paddingBottom: 160 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 160 },
  searchBarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  closeCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  searchIconRing: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchRowTitle: { fontSize: 15, flexShrink: 1 },
});
