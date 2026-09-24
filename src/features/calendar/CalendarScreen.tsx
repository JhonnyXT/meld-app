import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FloatingBar } from '@/components/FloatingBar';
import { Icon } from '@/components/Icon';
import { SegmentedToggle } from '@/components/SegmentedToggle';
import { DatePickerModal } from '@/components/datePicker/DatePickerModal';
import { CalendarFilterSheet } from '@/components/calendar/CalendarFilterSheet';
import { MonthHeatmapCard } from '@/components/calendar/MonthHeatmapCard';
import { WeekdayHeaderRow } from '@/components/calendar/WeekdayHeaderRow';
import { MonthDayCell } from '@/components/calendar/MonthDayCell';
import { WeekDaySelector } from '@/components/calendar/WeekDaySelector';
import { ListSkeleton } from '@/components/ListSkeleton';
import { WeekAgendaView } from './WeekAgendaView';
import { useWeekAgenda } from './useWeekAgenda';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { formatMonthYearLabel, formatFullMonthYear, formatHeaderDate, toDateKey, fromDateKey } from '@/domain/date';
import { buildMonthHeatmap } from '@/domain/calendarHeatmap';
import { computeHeatmapDotState, isHabitScheduledOn } from '@/domain/habit';
import { buildMonthGrid } from '@/domain/calendarGrid';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { useAddMenuStore } from '@/store/addMenuStore';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { useCalendarFilterStore, matchesCalendarFilter } from '@/store/calendarFilterStore';
import { CalendarTodayCard } from '@/components/calendar/CalendarTodayCard';
import { useRouter } from 'expo-router';
import type { DayItem, Habit } from '@/domain/dayItem';
import { CALENDAR_VIEW_ORDER, type CalendarView } from './calendarView';

export function CalendarScreen() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [view, setView] = useState<CalendarView>('month');
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  // Ir al detalle de un día del grid de Mes (celda tocada) o de la
  // `CalendarTodayCard` de abajo: reusa la misma pantalla Today que ya sabe
  // mostrar "otro día" (DayBar, ver "Cambiar de día en Today" en CLAUDE.md) en
  // vez de crear una pantalla de detalle de día nueva — Today ya trae la
  // lista completa de ítems de esa fecha y la barra "Volver a hoy" cuando no
  // es hoy. El día viaja por param de router (`?date=`, leído en
  // `TodayScreen`) — escribir `dayItemsStore.selectedDateKey` directo NO
  // alcanza, porque el estado real que pinta `DayBar`/el header de Today es
  // local a ese componente (bug real: probado primero solo con el store y no
  // navegaba al día tocado).
  const goToDay = (dateKey: string) => {
    router.push({ pathname: '/', params: { date: dateKey } });
  };
  // Mes que se está navegando en la vista Mes — separado de `today` a
  // propósito (agregado 2026-08-26): antes el grid de Mes SIEMPRE mostraba el
  // mes actual, sin poder navegar a otro. El día del mes no importa, solo
  // año/mes. La vista Año sigue anclada a `today.getFullYear()` — no está en
  // el alcance de este cambio.
  const [viewedMonth, setViewedMonth] = useState(() => new Date());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const monthGrid = useMemo(
    () => buildMonthGrid(viewedMonth.getFullYear(), viewedMonth.getMonth(), today),
    [viewedMonth, today],
  );
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

  // Estadísticas de HOY para `CalendarTodayCard` — siempre el día actual, sin
  // importar qué mes esté mirando el grid. Tasks/Moments salen de
  // `itemsByDate` (hoy siempre cae dentro del mes mostrado, `monthGrid` se
  // arma con `today.getMonth()`); Habits necesita su propio cálculo de
  // ocurrencias programadas (mismo patrón que `dayItemsStore.reload()` →
  // `loadHabitOccurrences`) porque un hábito solo vive en `itemsByDate` en su
  // fecha de creación, no en cada día que recurre.
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
        right={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setMonthPickerOpen(true)}
              style={[styles.headerActionBtn, { backgroundColor: palette.surfaceLow }]}
              accessibilityRole="button"
              accessibilityLabel={t('a11yCalendarMonthView')}
            >
              <Icon name="calendar-month" size={18} color={palette.text} />
            </Pressable>
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

      <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
        <SegmentedToggle
          options={[
            { value: 'month', label: t('viewMonth') },
            { value: 'week', label: t('viewWeek') },
            { value: 'year', label: t('viewYear') },
          ]}
          value={view}
          onChange={setView}
        />
      </View>

      <DatePickerModal
        visible={monthPickerOpen}
        selectedDateKey={toDateKey(view === 'month' ? viewedMonth : today)}
        onCancel={() => setMonthPickerOpen(false)}
        onSelect={(dateKey) => {
          if (dateKey) setViewedMonth(fromDateKey(dateKey));
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
              {weekAgenda.loading && Object.keys(weekAgenda.itemsByDate).length === 0 ? (
                <ListSkeleton count={6} />
              ) : (
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
              )}
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
              style={{ flex: 1, marginTop: 18 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160 }}
              showsVerticalScrollIndicator={false}
            >
              <WeekdayHeaderRow />
              <View style={styles.monthGrid}>
                {monthGrid.map((cell) => {
                  const dayItems = (itemsByDate[cell.dateKey] ?? []).filter((item) => matchesCalendarFilter(item, calendarFilter));
                  return <MonthDayCell key={cell.dateKey} cell={cell} items={dayItems} onPress={goToDay} />;
                })}
              </View>
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
            </ScrollView>
          )}
        </View>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 160 },
  yearCell: { width: '31%' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  pill: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  headerActionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
