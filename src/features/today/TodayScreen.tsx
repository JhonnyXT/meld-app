import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeOut, LinearTransition, runOnJS } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { TopAppBar } from '@/components/TopAppBar';
import { DayBar } from '@/components/DayBar';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/EmptyState';
import { TodayItemRow } from './TodayItemRow';
import { TodayGroupHeader } from './TodayGroupHeader';
import { ListSkeleton } from '@/components/ListSkeleton';
import { sortWithHealthHabitsLast } from './mapDayItemToRow';
import type { DayItem } from '@/domain/dayItem';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useDayItemsStore } from '@/store/dayItemsStore';
import { useInboxStore } from '@/store/inboxStore';
import { useQuickAddStore } from '@/store/quickAddStore';
import { useAddMenuStore } from '@/store/addMenuStore';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { useSearchStore } from '@/store/searchStore';
import { useRemindersStore } from '@/store/remindersStore';
import { useItemDetailStore } from '@/store/itemDetailStore';
import { useSettingsStore } from '@/store/settingsStore';
import { ICON_BY_TYPE } from '@/features/inbox/mapInboxItemToRow';
import { seedIfEmpty } from '@/data/local/seed';
import { isDev } from '@/constants/appVariant';
import { formatHeaderDate, formatDayBarDate, formatShortDateLabel, addDays, toDateKey, fromDateKey } from '@/domain/date';
import { syncNow, useSession } from '@/sync';

const ROW_TRANSITION = LinearTransition.duration(220);

const GROUP_ORDER = ['event', 'task', 'habit', 'note', 'voiceMemo'] as const;
const GROUP_LABEL_KEY = {
  event: 'filterEvents',
  task: 'filterTasks',
  habit: 'todayGroupHabits',
  note: 'filterNotes',
  voiceMemo: 'filterVoiceNotes',
} as const;

export function TodayScreen() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const isToday = toDateKey(selectedDate) === toDateKey(new Date());
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  useEffect(() => {
    if (dateParam) setSelectedDate(fromDateKey(dateParam));
  }, [dateParam]);
  const items = useDayItemsStore((s) => s.items);
  const loading = useDayItemsStore((s) => s.loading);
  const habitCompletedMap = useDayItemsStore((s) => s.habitCompletedMap);
  const taskCompletedMap = useDayItemsStore((s) => s.taskCompletedMap);
  const setStoreDate = useDayItemsStore((s) => s.setSelectedDate);
  const reload = useDayItemsStore((s) => s.reload);
  const toggleComplete = useDayItemsStore((s) => s.toggleComplete);
  const toggleHabitComplete = useDayItemsStore((s) => s.toggleHabitComplete);
  const reloadInbox = useInboxStore((s) => s.reload);
  const coolHabitsEnabled = useSettingsStore((s) => s.coolHabitsEnabled);

  const searchActive = useSearchStore((s) => s.active);
  const searchQuery = useSearchStore((s) => s.query);
  const searchResults = useSearchStore((s) => s.results);
  const setSearchQuery = useSearchStore((s) => s.setQuery);
  const submitSearch = useSearchStore((s) => s.submit);
  const closeSearch = useSearchStore((s) => s.close);
  const searchInputRef = useRef<TextInput>(null);

  const [grouped, setGrouped] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const { user: sessionUser } = useSession();

  useEffect(() => {
    (isDev ? seedIfEmpty() : Promise.resolve()).then(() => {
      setStoreDate(selectedDate);
      reloadInbox();
    });
  }, []);

  useEffect(() => {
    setStoreDate(selectedDate);
  }, [selectedDate]);

  // ver docs/adr/0019-today-entering-skeleton-forzado.md
  const [enteringToday, setEnteringToday] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setEnteringToday(true);
      (async () => {
        await Promise.all([reload(), reloadInbox()]);
        // ver docs/adr/0018-today-skeleton-no-espera-sync-remoto.md
        setEnteringToday(false);
        if (sessionUser) {
          await syncNow().catch(() => undefined);
          await Promise.all([reload(), reloadInbox()]);
        }
      })();
    }, [reload, reloadInbox, sessionUser]),
  );

  useEffect(() => {
    if (searchActive) {
      const timeout = setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => clearTimeout(timeout);
    }
  }, [searchActive]);

  const countableItems = items.filter((i) => i.type !== 'moment');
  const doneCount = countableItems.filter((i) => {
    if (i.type === 'habit') return habitCompletedMap[i.id];
    if (i.type === 'task' && i.repeatRule) return taskCompletedMap[i.id];
    return i.status === 'done';
  }).length;
  const isFiltering = searchActive && searchResults !== null;
  const visibleRows = isFiltering
    ? searchResults
    : sortWithHealthHabitsLast(
        items.filter(
          (i) =>
            i.type !== 'moment' &&
            !(i.type === 'task' && (i.repeatRule ? taskCompletedMap[i.id] : i.status === 'done')) &&
            !(i.type === 'habit' && habitCompletedMap[i.id]),
        ),
        coolHabitsEnabled,
      );

  const goToDay = (offset: number) => {
    if (isFiltering) return;
    setSelectedDate((d) => addDays(d, offset));
  };
  const swipeDayGesture = Gesture.Pan()
    .activeOffsetX([-40, 40])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX < -40 || e.velocityX < -600) {
        runOnJS(goToDay)(1);
      } else if (e.translationX > 40 || e.velocityX > 600) {
        runOnJS(goToDay)(-1);
      }
    });

  const renderTodayRow = (item: DayItem) => (
    <Animated.View key={item.id} layout={ROW_TRANSITION} entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
      <TodayItemRow
        item={item}
        onToggleComplete={toggleComplete}
        habitCompletedToday={habitCompletedMap[item.id] ?? false}
        onToggleHabitComplete={toggleHabitComplete}
        taskCompletedToday={taskCompletedMap[item.id] ?? false}
      />
    </Animated.View>
  );

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <TopAppBar
          title={t('today')}
          subtitle={formatHeaderDate(selectedDate, lang)}
          onMorePress={() => useRemindersStore.getState().open()}
          grouped={grouped}
          onToggleGroup={() => setGrouped((g) => !g)}
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

      <GestureDetector gesture={swipeDayGesture}>
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
        ) : !isFiltering && (enteringToday || (loading && visibleRows.length === 0)) ? (
          <Animated.View exiting={FadeOut.duration(160)}>
            <ListSkeleton />
          </Animated.View>
        ) : !isFiltering && visibleRows.length === 0 ? (
          <EmptyState
            icon="sun"
            title={t('todayEmptyTitle')}
            message={t('todayEmptyMessage')}
            ctaLabel={t('todayEmptyCta')}
            onPressCta={() => useQuickAddStore.getState().open('task')}
          />
        ) : isFiltering ? (
          visibleRows.map((item) => (
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
          ))
        ) : grouped ? (
          GROUP_ORDER.flatMap((type) => {
            const rows = visibleRows.filter((i) => i.type === type);
            if (rows.length === 0) return [];
            const isCollapsed = !!collapsedGroups[type];
            return [
              <Animated.View
                key={`group-${type}`}
                layout={ROW_TRANSITION}
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(140)}
              >
                <TodayGroupHeader
                  label={t(GROUP_LABEL_KEY[type])}
                  count={rows.length}
                  collapsed={isCollapsed}
                  onToggle={() => setCollapsedGroups((c) => ({ ...c, [type]: !c[type] }))}
                />
              </Animated.View>,
              ...(isCollapsed ? [] : rows.map(renderTodayRow)),
            ];
          })
        ) : (
          visibleRows.map(renderTodayRow)
        )}
      </ScrollView>
      </GestureDetector>

      <DayBar
        dateLabel={formatDayBarDate(selectedDate, lang)}
        doneLabel={t('doneOfTotal', { done: doneCount, total: countableItems.length })}
        isToday={isToday}
        onPrevDay={() => setSelectedDate((d) => addDays(d, -1))}
        onNextDay={() => setSelectedDate((d) => addDays(d, 1))}
        selectedDateKey={toDateKey(selectedDate)}
        onSelectDate={(dateKey) => setSelectedDate(fromDateKey(dateKey))}
        onBackToToday={() => setSelectedDate(new Date())}
        onAddPress={() => useAddMenuStore.getState().open()}
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
