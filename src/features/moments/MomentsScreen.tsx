import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FloatingBar } from '@/components/FloatingBar';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/ListSkeleton';
import { MomentsDayRow } from '@/components/moments/MomentsDayRow';
import { MomentPhotoViewer } from '@/components/moments/MomentPhotoViewer';
import { useTheme } from '@/theme/ThemeProvider';
import { toDateKey, fromDateKey, addDays, formatShortDateLabel, formatFullMonthYear } from '@/domain/date';
import { useTranslation } from '@/i18n';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { pickMomentPhotoForToday } from '@/services/pickMomentPhoto';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import type { Moment } from '@/domain/dayItem';

/** Ventana de días hacia atrás que se muestra en Momentos. */
const RANGE_DAYS = 90;

export function MomentsScreen() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const startKey = toDateKey(addDays(today, -RANGE_DAYS));
    const items = await dayItemRepository.listByDateRange(startKey, todayKey);
    setMoments(items.filter((i): i is Moment => i.type === 'moment'));
    setLoading(false);
  }, [today, todayKey]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const handleAddPhoto = async () => {
    const saved = await pickMomentPhotoForToday();
    if (saved) reload();
  };

  // Agrupa por día y ordena los días de más reciente a más antiguo. El día de
  // hoy SIEMPRE aparece (aunque no tenga fotos) para tener el "+" a mano.
  const days = useMemo(() => {
    const byDay = new Map<string, Moment[]>();
    for (const m of moments) {
      if (!m.date) continue;
      const list = byDay.get(m.date);
      if (list) list.push(m);
      else byDay.set(m.date, [m]);
    }
    if (!byDay.has(todayKey)) byDay.set(todayKey, []);
    return Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([dateKey, photos]) => ({
        dateKey,
        label:
          dateKey === todayKey
            ? lang === 'es'
              ? 'Hoy'
              : 'Today'
            : formatShortDateLabel(dateKey, lang, today),
        photos: [...photos].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      }));
  }, [moments, todayKey, lang, today]);

  const hasAnyMoment = moments.length > 0;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingHorizontal: 16 }, !hasAnyMoment && styles.contentEmpty]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 46, letterSpacing: -1, color: palette.text }}>
            {t('momentsTitle')}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: palette.textDim }}>
            {t('momentsSubtitle')}
          </Text>
        </View>

        {loading && !hasAnyMoment ? (
          <ListSkeleton variant="tiles" />
        ) : !hasAnyMoment ? (
          <>
            <MomentsDayRow
              label={lang === 'es' ? 'Hoy' : 'Today'}
              photos={[]}
              canAdd
              onAddPhoto={handleAddPhoto}
            />
            <EmptyState
              icon="photo-library"
              title={t('momentsEmptyTitle')}
              message={t('momentsEmptyMessage')}
            />
          </>
        ) : (
          days.map((day) => (
            <MomentsDayRow
              key={day.dateKey}
              label={day.label}
              photos={day.photos}
              canAdd={day.dateKey === todayKey}
              onAddPhoto={handleAddPhoto}
              onPressPhoto={(m) => setViewerUri(m.mediaUri)}
            />
          ))
        )}
      </ScrollView>

      <MomentPhotoViewer uri={viewerUri} onClose={() => setViewerUri(null)} />

      <FloatingBar
        onAddPress={handleAddPhoto}
        onMenuPress={() => useNavigateMenuStore.getState().open()}
        center={
          <View style={[styles.pill, { backgroundColor: palette.pillSolid }]}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('momentsTitle')}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: palette.textDim }}>
              {formatFullMonthYear(today, lang)}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 28, paddingTop: 12, paddingBottom: 160 },
  contentEmpty: { flexGrow: 1 },
  pill: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
