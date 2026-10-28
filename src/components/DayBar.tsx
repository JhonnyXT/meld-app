import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { FloatingBar } from './FloatingBar';
import { FLOATING_BAR_CONFIRM_ROW_HEIGHT } from './floatingBarGeometry';
import { WeekdayHeaderRow } from '@/components/calendar/WeekdayHeaderRow';
import { DayPickerCell } from '@/components/datePicker/DayPickerCell';
import { buildMonthGrid } from '@/domain/calendarGrid';
import { formatMonthYearLabel } from '@/domain/date';
import { MONTH_FULL } from '@/i18n/translations';

interface DayBarProps {
  dateLabel: string;
  doneLabel: string;
  /** Si el día mostrado no es hoy, `FloatingBar` se estira hacia arriba con
   * una fila "Volver a hoy" (mismo patrón que Undo/confirmar hora) en vez de
   * flotar una pill aparte. */
  isToday?: boolean;
  onMenuPress?: () => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  /** Día mostrado (`YYYY-MM-DD`) — lo marca el calendario desplegable. */
  selectedDateKey: string;
  /** Tocar un día en el calendario desplegable. */
  onSelectDate: (dateKey: string) => void;
  /** "Volver a hoy" — fila que aparece arriba de la barra cuando el día
   * mostrado no es el actual. */
  onBackToToday?: () => void;
  onAddPress?: () => void;
}

export function DayBar({
  dateLabel,
  doneLabel,
  isToday = true,
  onMenuPress,
  onPrevDay,
  onNextDay,
  selectedDateKey,
  onSelectDate,
  onBackToToday,
  onAddPress,
}: DayBarProps) {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  // Tocar el pill despliega el calendario del mes DENTRO de la barra (la
  // barra entera crece hacia arriba como una card), en vez del
  // `DatePickerModal` — pedido explícito del usuario 2026-10-27 con
  // referencia visual. Mientras está abierto, el pill pasa a navegar meses.
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [cursor, setCursor] = useState(() => monthStart(selectedDateKey));

  const openCalendar = () => {
    setCursor(monthStart(selectedDateKey));
    setCalendarOpen(true);
  };
  const closeCalendar = () => setCalendarOpen(false);
  const shiftMonth = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  useEffect(() => {
    if (!calendarOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setCalendarOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [calendarOpen]);

  const prev = calendarOpen ? () => shiftMonth(-1) : onPrevDay;
  const next = calendarOpen ? () => shiftMonth(1) : onNextDay;

  // Deslizar el pill de fecha cambia de día (izquierda = día siguiente,
  // derecha = día anterior), además de los chevrons — mismo umbral chico que
  // el resto de gestos horizontales dedicados (no compite con nada más acá,
  // a diferencia del swipe de pantalla completa de Calendar). `runOnJS`
  // porque el gesto corre en el hilo de UI y `onPrevDay`/`onNextDay` son
  // callbacks JS comunes.
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX < -16 || e.velocityX < -400) {
        if (next) runOnJS(next)();
      } else if (e.translationX > 16 || e.velocityX > 400) {
        if (prev) runOnJS(prev)();
      }
    });

  return (
    <>
    {calendarOpen ? (
      // Tocar fuera de la card cierra el calendario.
      <Pressable style={StyleSheet.absoluteFill} onPress={closeCalendar} accessibilityLabel={t('close')} />
    ) : null}
    <FloatingBar
      onMenuPress={() => {
        closeCalendar();
        onMenuPress?.();
      }}
      onAddPress={() => {
        closeCalendar();
        onAddPress?.();
      }}
      centerStyle={{ marginHorizontal: 0 }}
      topRow={!isToday ? <BackToTodayRow onPress={onBackToToday} /> : undefined}
      expandedPanel={
        calendarOpen ? (
          <DayBarCalendar
            cursor={cursor}
            selectedDateKey={selectedDateKey}
            monthTitle={MONTH_FULL[lang][cursor.getMonth()]}
            onSelect={(dateKey) => {
              onSelectDate(dateKey);
              closeCalendar();
            }}
          />
        ) : undefined
      }
      center={
        <GestureDetector gesture={swipeGesture}>
          <Pressable
            onPress={calendarOpen ? closeCalendar : openCalendar}
            style={[styles.pager, { backgroundColor: palette.pillSolid }]}
            accessibilityRole="button"
            accessibilityLabel={calendarOpen ? formatMonthYearLabel(cursor, lang) : dateLabel}
          >
            <Pressable
              onPress={prev}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('a11yPreviousDay')}
            >
              <Icon name="chevron-left" size={18} color={palette.textDim} />
            </Pressable>
            <View style={styles.pagerLabel}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: palette.text }}>
                {calendarOpen ? formatMonthYearLabel(cursor, lang) : dateLabel}
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 10, color: palette.textDim }}>
                {calendarOpen ? t('viewMonth') : doneLabel}
              </Text>
            </View>
            <Pressable
              onPress={next}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('a11yNextDay')}
            >
              <Icon name="chevron-right" size={18} color={palette.textDim} />
            </Pressable>
          </Pressable>
        </GestureDetector>
      }
    />
    </>
  );
}

function monthStart(dateKey: string): Date {
  const d = new Date(`${dateKey}T00:00:00`);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Calendario del mes que se despliega dentro de la barra. Los días de los
 * meses vecinos quedan en blanco (como en la referencia) y las semanas van
 * como filas explícitas de 7 (con `flexWrap` el redondeo de los % puede
 * mandar la 7ma celda a la fila siguiente — mismo motivo que el drawer). */
function DayBarCalendar({
  cursor,
  selectedDateKey,
  monthTitle,
  onSelect,
}: {
  cursor: Date;
  selectedDateKey: string;
  monthTitle: string;
  onSelect: (dateKey: string) => void;
}) {
  const { palette, font } = useTheme();
  const weeks = useMemo(() => {
    const grid = buildMonthGrid(cursor.getFullYear(), cursor.getMonth(), new Date());
    return Array.from({ length: grid.length / 7 }, (_, w) => grid.slice(w * 7, w * 7 + 7));
  }, [cursor]);

  return (
    <View>
      <Text style={[styles.monthTitle, { fontFamily: font.bold, color: palette.accent }]}>
        {monthTitle.toUpperCase()}
      </Text>
      <WeekdayHeaderRow />
      {weeks.map((week) => (
        <View key={week[0].dateKey} style={styles.weekRow}>
          {week.map((cell) =>
            cell.inCurrentMonth ? (
              <DayPickerCell
                key={cell.dateKey}
                cell={cell}
                selected={cell.dateKey === selectedDateKey}
                onPress={() => onSelect(cell.dateKey)}
              />
            ) : (
              <View key={cell.dateKey} style={styles.emptyCell} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

/** Fila interna de "Volver a hoy" — mismo patrón visual que `TimeConfirmRow`/
 * `UndoRow` de `FloatingBar` (altura `FLOATING_BAR_CONFIRM_ROW_HEIGHT`,
 * misma card, sin pill flotante aparte). */
function BackToTodayRow({ onPress }: { onPress?: () => void }) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.backToTodayRow}>
      <Text style={{ fontFamily: font.medium, fontSize: 14, color: palette.textDim, flex: 1 }}>
        {t('backToTodayLabel')}
      </Text>
      <Pressable onPress={onPress} style={[styles.backToTodayBtn, { backgroundColor: palette.accent }]}>
        <Text style={{ fontFamily: font.bold, fontSize: 14, color: '#fff' }}>{t('backToTodayCta')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  pagerLabel: { alignItems: 'center' },
  monthTitle: { fontSize: 13, letterSpacing: 1, marginBottom: 12, paddingHorizontal: 4 },
  weekRow: { flexDirection: 'row' },
  emptyCell: { width: `${100 / 7}%`, height: 40 },
  backToTodayRow: {
    height: FLOATING_BAR_CONFIRM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  backToTodayBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
