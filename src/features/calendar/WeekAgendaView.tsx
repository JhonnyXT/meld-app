import React from 'react';
import { Text, View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { TodayItemRow } from '@/features/today/TodayItemRow';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { toDateKey, formatDayBarDate } from '@/domain/date';
import { matchesCalendarFilter, type CalendarFilter } from '@/store/calendarFilterStore';
import type { DayItem } from '@/domain/dayItem';

interface WeekAgendaViewProps {
  days: Date[];
  itemsByDate: Record<string, DayItem[]>;
  filter: CalendarFilter;
  onToggleComplete: (id: string, date: string) => void;
  onDelete: (id: string, date: string) => void;
  onClearVoiceMemoAudio: (id: string, date: string) => void;
  onSectionLayout: (dateKey: string, y: number) => void;
}

/** Agenda vertical por día — mismas filas y acciones que Today
 * (`TodayItemRow`), pero con handlers propios (`useWeekAgenda`) porque los
 * ítems acá abarcan varios días, no solo el día seleccionado de Today. */
export function WeekAgendaView({
  days,
  itemsByDate,
  filter,
  onToggleComplete,
  onDelete,
  onClearVoiceMemoAudio,
  onSectionLayout,
}: WeekAgendaViewProps) {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();

  return (
    <View style={styles.wrap}>
      {days.map((day) => {
        const key = toDateKey(day);
        // A diferencia de Today, acá SÍ se siguen mostrando las tasks
        // completadas (tachadas) — "desaparece de la lista" es un
        // comportamiento específico de Today; Calendar es justamente donde el
        // registro completo debe seguir siendo visible (ver
        // `dayItemsStore.toggleComplete`).
        // Los Momentos viven en su propia pantalla — no se listan en la
        // agenda semanal (sí siguen contando para la miniatura del grid de Mes).
        const dayItems = (itemsByDate[key] ?? []).filter(
          (item) => item.type !== 'moment' && matchesCalendarFilter(item, filter),
        );
        return (
          <View
            key={key}
            style={styles.daySection}
            onLayout={(e: LayoutChangeEvent) => onSectionLayout(key, e.nativeEvent.layout.y)}
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: palette.textDim, marginBottom: 8 }}>
              {formatDayBarDate(day, lang)}
            </Text>
            {dayItems.length === 0 ? (
              <View style={[styles.emptyRow, { backgroundColor: palette.surfaceLow }]}>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textFaint }}>
                  {t('weekAgendaEmptyDay')}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {dayItems.map((item) => (
                  <TodayItemRow
                    key={item.id}
                    item={item}
                    onToggleComplete={(id) => onToggleComplete(id, key)}
                    onDelete={(id) => onDelete(id, key)}
                    onClearVoiceMemoAudio={(id) => onClearVoiceMemoAudio(id, key)}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 24, paddingBottom: 160 },
  daySection: {},
  emptyRow: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 },
});
