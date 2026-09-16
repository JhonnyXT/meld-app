import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';

interface CalendarTodayCardProps {
  dateLabel: string;
  tasksDone: number;
  tasksTotal: number;
  habitsDone: number;
  habitsTotal: number;
  momentsCount: number;
  momentThumbUri: string | null;
  onViewDay: () => void;
}

/** Tarjeta resumen de "Hoy" debajo del grid de Mes — fiel al mock de Pen
 * "Calendar Screen" ("Today Card"). Muestra progreso del día actual sin
 * importar el mes que se esté mirando (siempre es HOY, no el día
 * seleccionado del grid — el grid en sí no tiene día "seleccionado" hoy). */
export function CalendarTodayCard({
  dateLabel,
  tasksDone,
  tasksTotal,
  habitsDone,
  habitsTotal,
  momentsCount,
  momentThumbUri,
  onViewDay,
}: CalendarTodayCardProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onViewDay}
      style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={styles.headerRow}>
        <Text style={{ fontFamily: font.bold, fontSize: 14.5, color: palette.text }}>
          {t('today')} · {dateLabel}
        </Text>
        <View style={[styles.viewDayBtn, { backgroundColor: palette.surfaceLow }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: palette.text }}>
            {t('calendarTodayCardViewDay')}
          </Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={{ fontFamily: font.bold, fontSize: 19, color: palette.text }}>
            {tasksDone}/{tasksTotal}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: palette.textDim }}>
            {t('calendarTodayCardTasksDone')}
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={{ fontFamily: font.bold, fontSize: 19, color: palette.text }}>
            {habitsDone}/{habitsTotal}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: palette.textDim }}>
            {t('calendarTodayCardHabitsDone')}
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={{ fontFamily: font.bold, fontSize: 19, color: palette.text }}>{momentsCount}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: palette.textDim }}>
            {t('calendarTodayCardMoments')}
          </Text>
        </View>
        <View style={styles.thumbSlot}>
          {momentThumbUri ? (
            <Image source={{ uri: momentThumbUri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: palette.surfaceLow }]} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewDayBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCol: { flex: 1, gap: 2 },
  thumbSlot: { width: 44, alignItems: 'flex-end' },
  thumb: { width: 44, height: 44, borderRadius: 10 },
});
