import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FloatingBar } from '@/components/FloatingBar';
import { CalendarViewSwitch } from '@/components/calendar/CalendarViewSwitch';
import { CalendarFilterBar } from '@/components/calendar/CalendarFilterBar';
import { CalendarFilterSheet } from '@/components/calendar/CalendarFilterSheet';
import { MonthHeatmapCard } from '@/components/calendar/MonthHeatmapCard';
import { WeekdayHeaderRow } from '@/components/calendar/WeekdayHeaderRow';
import { MonthDayCell } from '@/components/calendar/MonthDayCell';
import { WeekDaySelector } from '@/components/calendar/WeekDaySelector';
import { WeekAgendaView } from './WeekAgendaView';
import { useWeekAgenda } from './useWeekAgenda';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { formatMonthYearLabel, formatFullMonthYear, formatHeaderDate } from '@/domain/date';
import { buildMonthHeatmap } from '@/domain/calendarHeatmap';
import { computeHeatmapDotState } from '@/domain/habit';
import { buildMonthGrid } from '@/domain/calendarGrid';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { useQuickAddStore } from '@/store/quickAddStore';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { useCalendarFilterStore, matchesCalendarFilter } from '@/store/calendarFilterStore';
import type { DayItem, Habit } from '@/domain/dayItem';
import { CALENDAR_VIEW_ORDER, type CalendarView } from './calendarView';

export function CalendarScreen() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const [view, setView] = useState<CalendarView>('year');
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();

  const monthGrid = useMemo(() => buildMonthGrid(year, today.getMonth(), today), [year, today]);
  const [itemsByDate, setItemsByDate] = useState<Record<string, DayItem[]>>({});
  const calendarFilter = useCalendarFilterStore((s) => s.filter);

  // Datos reales de completado de hábitos para el heatmap de Año (reemplaza
  // el placeholder de hash determinístico — ver `domain/habit.ts` →
  // `computeHeatmapDotState`). Si el filtro de Calendario es un hábito
  // específico, el heatmap agrega solo ESE hábito; si no, agrega entre todos.
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
  const weekScrollRef = useRef<ScrollView>(null);
  const weekSectionOffsets = useRef<Record<string, number>>({});
  const scrollToWeekDay = (dateKey: string) => {
    const y = weekSectionOffsets.current[dateKey];
    if (y != null) weekScrollRef.current?.scrollTo({ y: Math.max(y - 8, 0), animated: true });
  };

  const stepView = (direction: 1 | -1) => {
    const index = CALENDAR_VIEW_ORDER.indexOf(view);
    const next = CALENDAR_VIEW_ORDER[index + direction];
    if (next) setView(next);
  };

  // Umbral alto (40px / 600px/s) para no competir con el swipe-to-delete de
  // las filas de Semana (`SwipeToDeleteCard`, activeOffsetX ±10) — al ser más
  // exigente, el gesto de la fila gana siempre que el toque empieza sobre
  // ella; este gesto de nivel pantalla solo captura el swipe cuando arranca
  // en un área sin fila (grillas de Mes/Año, encabezados, huecos).
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

  const monthItemsCount = useMemo(() => {
    if (view !== 'month') return 0;
    return monthGrid
      .filter((cell) => cell.inCurrentMonth)
      .reduce((sum, cell) => sum + (itemsByDate[cell.dateKey] ?? []).filter((item) => matchesCalendarFilter(item, calendarFilter)).length, 0);
  }, [view, monthGrid, itemsByDate, calendarFilter]);

  useEffect(() => {
    if (view !== 'month' || monthGrid.length === 0) return;
    const startKey = monthGrid[0].dateKey;
    const endKey = monthGrid[monthGrid.length - 1].dateKey;
    dayItemRepository.listByDateRange(startKey, endKey).then((items) => {
      const grouped: Record<string, DayItem[]> = {};
      for (const item of items) {
        if (!item.date) continue;
        (grouped[item.date] ??= []).push(item);
      }
      setItemsByDate(grouped);
    });
  }, [view, monthGrid]);

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScreenHeader
        style={{ paddingHorizontal: 16 }}
        title={
          <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: palette.text }}>
            {view === 'year' ? year : formatFullMonthYear(today, lang)}
          </Text>
        }
        subtitle={
          <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>
            {view === 'year'
              ? t('calendarYearSubtitle')
              : view === 'month'
                ? t('monthEventsCount', { count: monthItemsCount })
                : formatHeaderDate(today, lang)}
          </Text>
        }
        right={<CalendarViewSwitch value={view} onChange={setView} />}
      />

      {view === 'week' ? (
        <View style={{ paddingHorizontal: 16 }}>
          <WeekDaySelector
            days={weekAgenda.days}
            itemsByDate={weekAgenda.itemsByDate}
            filter={calendarFilter}
            onSelectDay={scrollToWeekDay}
          />
        </View>
      ) : null}

      <GestureDetector gesture={swipeViewGesture}>
        <View style={{ flex: 1 }}>
          {view === 'week' ? (
            <ScrollView
              ref={weekScrollRef}
              style={{ flex: 1, marginTop: 20 }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <WeekAgendaView
                days={weekAgenda.days}
                itemsByDate={weekAgenda.itemsByDate}
                filter={calendarFilter}
                onToggleComplete={weekAgenda.toggleComplete}
                onDelete={weekAgenda.remove}
                onClearVoiceMemoAudio={weekAgenda.clearVoiceMemoAudio}
                onSectionLayout={(dateKey, y) => {
                  weekSectionOffsets.current[dateKey] = y;
                }}
              />
            </ScrollView>
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
            <ScrollView
              style={{ flex: 1, marginTop: 24 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160 }}
              showsVerticalScrollIndicator={false}
            >
              <WeekdayHeaderRow />
              <View style={styles.monthGrid}>
                {monthGrid.map((cell) => {
                  const dayItems = (itemsByDate[cell.dateKey] ?? []).filter((item) => matchesCalendarFilter(item, calendarFilter));
                  return <MonthDayCell key={cell.dateKey} cell={cell} labels={dayItems.map((item) => item.title)} />;
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </GestureDetector>

      <FloatingBar
        barRadius={24}
        onAddPress={() => useQuickAddStore.getState().open('event')}
        onMenuPress={() => useNavigateMenuStore.getState().open()}
        center={
          <View style={styles.pill}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: palette.text }}>
              {formatMonthYearLabel(today, lang)}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 10, color: palette.textDim }}>
              {view === 'year' ? t('viewYear') : view === 'week' ? t('viewWeek') : t('viewMonth')}
            </Text>
          </View>
        }
      />
      <CalendarFilterBar />
      <CalendarFilterSheet />
    </Screen>
  );
}

const styles = StyleSheet.create({
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 160 },
  yearCell: { width: '31%' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  pill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
