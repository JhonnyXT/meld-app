import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { FlashList, type ViewToken } from '@shopify/flash-list';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FloatingBar } from '@/components/FloatingBar';
import { Icon } from '@/components/Icon';
import { DatePickerModal } from '@/components/datePicker/DatePickerModal';
import { CalendarFilterSheet } from '@/components/calendar/CalendarFilterSheet';
import { DayItemsModal } from '@/components/calendar/DayItemsModal';
import { MonthHeatmapCard } from '@/components/calendar/MonthHeatmapCard';
import { WeekdayHeaderRow } from '@/components/calendar/WeekdayHeaderRow';
import { MonthWeekRow } from '@/components/calendar/MonthWeekRow';
import { MonthDividerRow } from '@/components/calendar/MonthDividerRow';
import { WeekDaySelector } from '@/components/calendar/WeekDaySelector';
import { WeekHourGrid } from '@/components/calendar/WeekHourGrid';
import { ListSkeleton } from '@/components/ListSkeleton';
import { useWeekAgenda } from './useWeekAgenda';
import { useItemDetailStore } from '@/store/itemDetailStore';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import {
  formatMonthYearLabel,
  formatFullMonthYear,
  formatHeaderDate,
  toDateKey,
  fromDateKey,
  MONTH_SHORT,
} from '@/domain/date';
import { buildMonthHeatmap } from '@/domain/calendarHeatmap';
import { computeHeatmapDotState, isHabitScheduledOn } from '@/domain/habit';
import { buildWeekRows, type WeekRow } from '@/domain/calendarGrid';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { useAddMenuStore } from '@/store/addMenuStore';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { useCalendarFilterStore, matchesCalendarFilter } from '@/store/calendarFilterStore';
import { CalendarTodayCard } from '@/components/calendar/CalendarTodayCard';
import { useRouter } from 'expo-router';
import type { DayItem, Habit } from '@/domain/dayItem';
import { CALENDAR_VIEW_ORDER, CALENDAR_ZOOM_ORDER, type CalendarView } from './calendarView';

const PINCH_IN_THRESHOLD = 1.25;
const PINCH_OUT_THRESHOLD = 0.8;

// ver docs/adr/0025-calendario-scroll-continuo.md
const INITIAL_WEEKS = 26;
const GROW_WEEKS = 26;

type MonthScrollRow =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'week'; key: string; week: WeekRow };

function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function CalendarScreen() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [view, setView] = useState<CalendarView>('month');
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const goToDay = (dateKey: string) => {
    router.push({ pathname: '/', params: { date: dateKey } });
  };
  const [viewedMonth, setViewedMonth] = useState(() => new Date());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [dayItemsModalKey, setDayItemsModalKey] = useState<string | null>(null);

  // El centro de la ventana de semanas cargadas solo cambia con un salto deliberado
  // (elegir un mes en el selector) — nunca con el scroll normal, que solo actualiza
  // `viewedMonth` (el label del header). Ver docs/adr/0025-calendario-scroll-continuo.md
  const [windowCenter, setWindowCenter] = useState(() => new Date());
  // Scroll "infinito": crecen al acercarse a cualquiera de los dos bordes
  // (onStartReached/onEndReached), nunca se achican — ver docs/adr/0025.
  const [weeksBack, setWeeksBack] = useState(INITIAL_WEEKS);
  const [weeksForward, setWeeksForward] = useState(INITIAL_WEEKS);
  const weekRows = useMemo(
    () => buildWeekRows(windowCenter, weeksBack, weeksForward, today),
    [windowCenter, weeksBack, weeksForward, today],
  );
  const [itemsByDate, setItemsByDate] = useState<Record<string, DayItem[]>>({});
  const calendarFilter = useCalendarFilterStore((s) => s.filter);

  const [habitHeatmapData, setHabitHeatmapData] = useState<{
    habits: { id: string; targetFrequency: string }[];
    completions: Map<string, Set<string>>;
  } | null>(null);

  useEffect(() => {
    if (view !== 'year') return;
    let cancelled = false;
    (async () => {
      const allHabits = (await dayItemRepository.listActiveHabits()) as Habit[];
      const scopedHabits = calendarFilter.kind === 'habit' ? allHabits.filter((h) => h.title === calendarFilter.title) : allHabits;
      const startKey = `${year}-01-01`;
      const endKey = `${year}-12-31`;
      const entries = await Promise.all(
        scopedHabits.map(
          async (h) => [h.id, new Set(await dayItemRepository.listHabitCompletionDates(h.id, startKey, endKey))] as const,
        ),
      );
      if (cancelled) return;
      setHabitHeatmapData({
        habits: scopedHabits.map((h) => ({ id: h.id, targetFrequency: h.targetFrequency })),
        completions: new Map(entries),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [view, year, calendarFilter]);

  const yearHeatmaps = useMemo(() => {
    const dayState = habitHeatmapData
      ? (dateKey: string, date: Date) => {
          const isCompleted = (habitId: string, key: string) => habitHeatmapData.completions.get(habitId)?.has(key) ?? false;
          return computeHeatmapDotState(habitHeatmapData.habits, isCompleted, dateKey, date);
        }
      : () => 'none' as const;
    return Array.from({ length: 12 }, (_, m) => buildMonthHeatmap(year, m, today, dayState, lang));
  }, [habitHeatmapData, year, today, lang]);

  const weekAgenda = useWeekAgenda(today);

  const stepView = (direction: 1 | -1) => {
    const index = CALENDAR_VIEW_ORDER.indexOf(view);
    const next = CALENDAR_VIEW_ORDER[index + direction];
    if (next) setView(next);
  };

  const swipeViewGesture = Gesture.Pan()
    .activeOffsetX([-40, 40])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationX < -40 || e.velocityX < -600) {
        runOnJS(stepView)(1);
      } else if (e.translationX > 40 || e.velocityX > 600) {
        runOnJS(stepView)(-1);
      }
    });

  const stepZoom = (direction: 1 | -1) => {
    const index = CALENDAR_ZOOM_ORDER.indexOf(view);
    const next = CALENDAR_ZOOM_ORDER[index + direction];
    if (!next) return;
    Haptics.selectionAsync().catch(() => {});
    setView(next);
  };

  const pinchScale = useSharedValue(1);
  const pinchFeedbackStyle = useAnimatedStyle(() => ({ transform: [{ scale: pinchScale.value }] }));

  const pinchZoomGesture = Gesture.Pinch()
    .onUpdate((e) => {
      // Solo un guiño visual mientras se pellizca — ver docs/adr/0023-zoom-calendario.md
      pinchScale.value = 1 + (e.scale - 1) * 0.06;
    })
    .onEnd((e) => {
      pinchScale.value = withTiming(1, { duration: 180 });
      if (e.scale > PINCH_IN_THRESHOLD) runOnJS(stepZoom)(1);
      else if (e.scale < PINCH_OUT_THRESHOLD) runOnJS(stepZoom)(-1);
    })
    .onFinalize(() => {
      pinchScale.value = withTiming(1, { duration: 180 });
    });

  const calendarGesture = Gesture.Simultaneous(swipeViewGesture, pinchZoomGesture);

  useEffect(() => {
    if (view !== 'month' || weekRows.length === 0) return;
    const startKey = weekRows[0].cells[0].dateKey;
    const endKey = weekRows[weekRows.length - 1].cells[6].dateKey;
    dayItemRepository.listByDateRange(startKey, endKey).then((items) => {
      const grouped: Record<string, DayItem[]> = {};
      for (const item of items) {
        if (!item.date) continue;
        (grouped[item.date] ??= []).push(item);
      }
      setItemsByDate(grouped);
    });
  }, [view, weekRows]);

  const monthCounts = useMemo(() => {
    const counts: Record<string, { events: number; tasks: number }> = {};
    for (const dateKey in itemsByDate) {
      const monthKey = monthKeyOf(dateKey);
      const entry = (counts[monthKey] ??= { events: 0, tasks: 0 });
      for (const item of itemsByDate[dateKey]) {
        if (item.type === 'event') entry.events += 1;
        else if (item.type === 'task') entry.tasks += 1;
      }
    }
    return counts;
  }, [itemsByDate]);

  const filteredItemsByDate = useMemo(() => {
    const result: Record<string, DayItem[]> = {};
    for (const dateKey in itemsByDate) {
      result[dateKey] = itemsByDate[dateKey].filter((item) => matchesCalendarFilter(item, calendarFilter));
    }
    return result;
  }, [itemsByDate, calendarFilter]);

  const filteredWeekItemsByDate = useMemo(() => {
    const result: Record<string, DayItem[]> = {};
    for (const dateKey in weekAgenda.itemsByDate) {
      result[dateKey] = weekAgenda.itemsByDate[dateKey].filter((item) => matchesCalendarFilter(item, calendarFilter));
    }
    return result;
  }, [weekAgenda.itemsByDate, calendarFilter]);

  const calendarRows = useMemo<MonthScrollRow[]>(() => {
    const rows: MonthScrollRow[] = [];
    let lastMonthKey: string | null = null;
    for (const week of weekRows) {
      for (const cell of week.cells) {
        const monthKey = monthKeyOf(cell.dateKey);
        if (monthKey !== lastMonthKey) {
          rows.push({ kind: 'divider', key: `divider-${monthKey}`, label: MONTH_SHORT[lang][cell.date.getMonth()] });
          lastMonthKey = monthKey;
        }
      }
      rows.push({ kind: 'week', key: week.key, week });
    }
    return rows;
  }, [weekRows, lang]);

  const windowCenterKey = toDateKey(windowCenter);
  const initialScrollIndex = useMemo(() => {
    const index = calendarRows.findIndex(
      (row) => row.kind === 'week' && row.week.cells.some((c) => c.dateKey === windowCenterKey),
    );
    return index >= 0 ? index : null;
  }, [calendarRows, windowCenterKey]);

  const handleViewableRowsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<MonthScrollRow>[] }) => {
      const firstWeek = viewableItems.find((v) => v.item?.kind === 'week')?.item;
      if (!firstWeek || firstWeek.kind !== 'week') return;
      const candidate = firstWeek.week.cells[0].date;
      if (candidate.getFullYear() !== viewedMonth.getFullYear() || candidate.getMonth() !== viewedMonth.getMonth()) {
        setViewedMonth(candidate);
      }
    },
    [viewedMonth],
  );

  const handleReachStart = useCallback(() => setWeeksBack((w) => w + GROW_WEEKS), []);
  const handleReachEnd = useCallback(() => setWeeksForward((w) => w + GROW_WEEKS), []);

  const todayKey = toDateKey(today);
  const [todayHabitStats, setTodayHabitStats] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (view !== 'month') return;
    let cancelled = false;
    (async () => {
      const allHabits = (await dayItemRepository.listActiveHabits()) as Habit[];
      const scheduled = allHabits.filter((h) => isHabitScheduledOn(h.targetFrequency, today));
      const completions = await dayItemRepository.listAllHabitCompletionsInRange(todayKey, todayKey);
      const completedIds = new Set(completions.map((c) => c.habitId));
      if (cancelled) return;
      setTodayHabitStats({ done: scheduled.filter((h) => completedIds.has(h.id)).length, total: scheduled.length });
    })();
    return () => {
      cancelled = true;
    };
  }, [view, todayKey, today]);

  const todayItems = itemsByDate[todayKey] ?? [];
  const todayTasks = todayItems.filter((i) => i.type === 'task');
  const todayMoments = todayItems.filter((i) => i.type === 'moment');

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScreenHeader
        style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 }}
        title={
          <Pressable onPress={() => setMonthPickerOpen(true)} style={styles.titleWrap} hitSlop={8}>
            <Text style={{ fontFamily: font.extrabold, fontSize: 28, letterSpacing: -0.4, color: palette.text }}>
              {view === 'year' ? year : formatFullMonthYear(view === 'month' ? viewedMonth : today, lang)}
            </Text>
            <Icon name="chevron-down" size={20} color={palette.textDim} />
          </Pressable>
        }
        subtitle={
          view === 'month' ? (
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim }}>
              {t('monthEventsCount', { count: monthCounts[toDateKey(viewedMonth).slice(0, 7)]?.events ?? 0 })}
              {' · '}
              {t('monthTasksCount', { count: monthCounts[toDateKey(viewedMonth).slice(0, 7)]?.tasks ?? 0 })}
            </Text>
          ) : view === 'week' && weekAgenda.days.length === 7 ? (
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim }}>
              {MONTH_SHORT[lang][weekAgenda.days[0].getMonth()]} {weekAgenda.days[0].getDate()}
              {' – '}
              {weekAgenda.days[0].getMonth() !== weekAgenda.days[6].getMonth()
                ? `${MONTH_SHORT[lang][weekAgenda.days[6].getMonth()]} `
                : ''}
              {weekAgenda.days[6].getDate()}, {weekAgenda.days[6].getFullYear()}
            </Text>
          ) : undefined
        }
        right={
          <View style={styles.headerActions}>
            <View style={[styles.viewSwitcher, { backgroundColor: palette.surfaceLow }]}>
              {([
                ['month', 'view-grid'],
                ['week', 'view-week'],
                ['year', 'calendar-month'],
              ] as const).map(([v, icon]) => {
                const active = view === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setView(v)}
                    style={[styles.viewSwitcherBtn, active && { backgroundColor: palette.accent }]}
                    accessibilityRole="button"
                    accessibilityLabel={v === 'month' ? t('viewMonth') : v === 'week' ? t('viewWeek') : t('viewYear')}
                    accessibilityState={{ selected: active }}
                  >
                    <Icon name={icon} size={16} color={active ? '#fff' : palette.textDim} />
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => useCalendarFilterStore.getState().openSheet()}
              style={[styles.headerActionBtn, { backgroundColor: palette.surfaceLow }]}
              accessibilityRole="button"
              accessibilityLabel={t('filterLabel')}
            >
              <Icon name="more-horiz" size={18} color={palette.text} />
            </Pressable>
          </View>
        }
      />

      <DatePickerModal
        visible={monthPickerOpen}
        selectedDateKey={toDateKey(view === 'month' ? viewedMonth : today)}
        onCancel={() => setMonthPickerOpen(false)}
        onSelect={(dateKey) => {
          if (dateKey) {
            const picked = fromDateKey(dateKey);
            setViewedMonth(picked);
            setWindowCenter(picked);
            setWeeksBack(INITIAL_WEEKS);
            setWeeksForward(INITIAL_WEEKS);
          }
          setView('month');
          setMonthPickerOpen(false);
        }}
      />

      {view === 'week' ? (
        <View style={{ paddingHorizontal: 16 }}>
          <WeekDaySelector
            days={weekAgenda.days}
            itemsByDate={weekAgenda.itemsByDate}
            filter={calendarFilter}
            onSelectDay={goToDay}
          />
        </View>
      ) : null}

      <GestureDetector gesture={calendarGesture}>
        <Animated.View style={[{ flex: 1 }, pinchFeedbackStyle]}>
          {view === 'week' ? (
            weekAgenda.loading && Object.keys(weekAgenda.itemsByDate).length === 0 ? (
              <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                <ListSkeleton count={6} />
              </View>
            ) : (
              <View style={{ flex: 1, marginTop: 12, paddingHorizontal: 16 }}>
                <WeekHourGrid
                  days={weekAgenda.days}
                  itemsByDate={filteredWeekItemsByDate}
                  onPressItem={(id) => useItemDetailStore.getState().open(id)}
                />
              </View>
            )
          ) : view === 'year' ? (
            <ScrollView
              style={{ flex: 1, marginTop: 32 }}
              contentContainerStyle={[styles.yearGrid, { paddingHorizontal: 16 }]}
              showsVerticalScrollIndicator={false}
            >
              {yearHeatmaps.map((heatmap) => (
                <View key={heatmap.monthIndex} style={styles.yearCell}>
                  <MonthHeatmapCard heatmap={heatmap} highlighted={heatmap.monthIndex === today.getMonth()} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <>
              <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
                <WeekdayHeaderRow />
              </View>
              <FlashList<MonthScrollRow>
                key={windowCenterKey}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160 }}
                showsVerticalScrollIndicator={false}
                data={calendarRows}
                keyExtractor={(row) => row.key}
                initialScrollIndex={initialScrollIndex ?? undefined}
                onStartReached={handleReachStart}
                onEndReached={handleReachEnd}
                onViewableItemsChanged={handleViewableRowsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
                renderItem={({ item: row }) =>
                  row.kind === 'divider' ? (
                    <MonthDividerRow label={row.label} />
                  ) : (
                    <MonthWeekRow
                      week={row.week}
                      itemsByDate={filteredItemsByDate}
                      onPressDay={goToDay}
                      onPressItem={(id) => useItemDetailStore.getState().open(id)}
                      onPressOverflow={setDayItemsModalKey}
                    />
                  )
                }
                ListFooterComponent={
                  <View style={{ marginTop: 18 }}>
                    <CalendarTodayCard
                      dateLabel={formatHeaderDate(today, lang)}
                      tasksDone={todayTasks.filter((i) => i.status === 'done').length}
                      tasksTotal={todayTasks.length}
                      habitsDone={todayHabitStats.done}
                      habitsTotal={todayHabitStats.total}
                      momentsCount={todayMoments.length}
                      momentThumbUri={todayMoments[0]?.mediaUri ?? null}
                      onViewDay={() => goToDay(toDateKey(today))}
                    />
                  </View>
                }
              />
            </>
          )}
        </Animated.View>
      </GestureDetector>

      <FloatingBar
        onAddPress={() => useAddMenuStore.getState().open()}
        onMenuPress={() => useNavigateMenuStore.getState().open()}
        center={
          <View style={[styles.pill, { backgroundColor: palette.pillSolid }]}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: palette.text }}>
              {formatMonthYearLabel(today, lang)}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 10, color: palette.textDim }}>
              {view === 'year' ? t('viewYear') : view === 'week' ? t('viewWeek') : t('viewMonth')}
            </Text>
          </View>
        }
      />
      <CalendarFilterSheet />
      <DayItemsModal
        visible={!!dayItemsModalKey}
        date={dayItemsModalKey ? fromDateKey(dayItemsModalKey) : null}
        items={dayItemsModalKey ? (filteredItemsByDate[dayItemsModalKey] ?? []) : []}
        onClose={() => setDayItemsModalKey(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 160 },
  yearCell: { width: '31%' },
  pill: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerActionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  viewSwitcher: { flexDirection: 'row', borderRadius: 12, padding: 2, gap: 2 },
  viewSwitcherBtn: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
