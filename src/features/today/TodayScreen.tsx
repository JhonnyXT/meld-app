import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeOut, LinearTransition, runOnJS } from 'react-native-reanimated';
import { Screen } from '@/components/Screen';
import { TopAppBar } from '@/components/TopAppBar';
import { DayBar } from '@/components/DayBar';
import { DatePickerModal } from '@/components/datePicker/DatePickerModal';
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

const ROW_TRANSITION = LinearTransition.duration(220);

// Orden de las secciones cuando la lista de Today está agrupada por tipo
// (toggle del ícono de filtro en el header). Momentos no aparece en Today.
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
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const isToday = toDateKey(selectedDate) === toDateKey(new Date());
  // Ir a un día puntual desde otra pantalla (p. ej. tocar una celda del grid
  // de Mes o la `CalendarTodayCard` en Calendar) pasa `?date=YYYY-MM-DD` por
  // param de router en vez de tocar el store directo — `selectedDate` de acá
  // es el estado real que pinta `DayBar`/el header, el store solo lo refleja
  // (ver el `useEffect` de sync más abajo), así que solo escribir el store no
  // alcanza para "saltar" a otro día.
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  useEffect(() => {
    if (dateParam) setSelectedDate(fromDateKey(dateParam));
  }, [dateParam]);
  const items = useDayItemsStore((s) => s.items);
  const loading = useDayItemsStore((s) => s.loading);
  const habitCompletedMap = useDayItemsStore((s) => s.habitCompletedMap);
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

  // Vista agrupada por tipo — solo dura la sesión (arranca plana, todo
  // expandido; se resetea al reiniciar la app, decisión explícita).
  const [grouped, setGrouped] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Data de muestra SOLO en dev (iterar día a día necesita algo para ver) —
    // test/prod deben instalar 100% vacíos, sin ítems de ejemplo, para que un
    // build "limpio" (`npm run build:test`) realmente lo sea. Antes se
    // llamaba sin condición y test/prod arrancaban con la misma data de
    // Stitch que dev (bug real reportado, no reintroducirlo).
    (isDev ? seedIfEmpty() : Promise.resolve()).then(() => {
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
  // Los Momentos viven en su propia pantalla — no cuentan en "X de Y hechos"
  // ni aparecen en la lista de Today (ver `visibleRows` abajo).
  const countableItems = items.filter((i) => i.type !== 'moment');
  const doneCount = countableItems.filter((i) =>
    i.type === 'habit' ? habitCompletedMap[i.id] : i.status === 'done',
  ).length;
  const isFiltering = searchActive && searchResults !== null;
  // Maquetación gris de carga: solo mientras el store está cargando y todavía
  // no hay nada que pintar (primera entrada). Al cambiar de día desde una
  // lista con ítems, `items` conserva los anteriores hasta que llega la nueva
  // tanda, así que no se muestra el skeleton (no parpadea).
  // Una task completada, o un hábito (manual o "de salud") marcado hecho ese
  // día, desaparecen de la lista (con animación de salida) pero el registro
  // sigue en la DB tal cual — Calendar sigue viéndolo (el heatmap de Año lee
  // `habit_completions` directo, sin importar si Today lo muestra u oculta) y
  // la recurrencia (`isHabitScheduledOn`) lo vuelve a traer al día siguiente
  // si corresponde. Ver CLAUDE.md → "Completar una task (desaparece de la
  // lista)".
  const visibleRows = isFiltering
    ? searchResults
    : sortWithHealthHabitsLast(
        items.filter(
          (i) =>
            i.type !== 'moment' &&
            !(i.type === 'task' && i.status === 'done') &&
            !(i.type === 'habit' && habitCompletedMap[i.id]),
        ),
        coolHabitsEnabled,
      );

  // Deslizar en cualquier parte de la lista cambia de día — mismo mecanismo
  // que `swipeViewGesture` de Calendar (pedido explícito del usuario,
  // 2026-09-16): umbral alto (40px/600px·s) para no competir con el
  // swipe-to-delete de las filas (`SwipeToDeleteCard`, activeOffsetX ±10) —
  // el gesto de la fila gana siempre que el toque arranca sobre ella, este
  // solo captura el swipe cuando arranca en un hueco sin fila. `failOffsetY`
  // deja pasar el scroll vertical. Se ignora mientras hay una búsqueda
  // activa (no tiene sentido cambiar de día viendo resultados).
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
        ) : !isFiltering && loading && visibleRows.length === 0 ? (
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
        onDatePress={() => setDatePickerVisible(true)}
        onBackToToday={() => setSelectedDate(new Date())}
        onAddPress={() => useAddMenuStore.getState().open()}
        onMenuPress={() => useNavigateMenuStore.getState().open()}
      />

      <DatePickerModal
        visible={datePickerVisible}
        selectedDateKey={toDateKey(selectedDate)}
        onCancel={() => setDatePickerVisible(false)}
        onSelect={(dateKey) => {
          if (dateKey) setSelectedDate(fromDateKey(dateKey));
          setDatePickerVisible(false);
        }}
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
