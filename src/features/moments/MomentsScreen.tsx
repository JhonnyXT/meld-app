import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FloatingBar } from '@/components/FloatingBar';
import { MomentsWeekRow } from '@/components/moments/MomentsWeekRow';
import { MomentsCollapsedWeekRow } from '@/components/moments/MomentsCollapsedWeekRow';
import { useTheme } from '@/theme/ThemeProvider';
import { toDateKey } from '@/domain/date';
import { MONTH_FULL } from '@/i18n/translations';
import { useTranslation } from '@/i18n';
import { recentWeeks } from '@/domain/week';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { pickMomentPhotoForWeek } from '@/services/pickMomentPhoto';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import type { Moment } from '@/domain/dayItem';

const FULL_WEEKS_COUNT = 2;
const COLLAPSED_WEEKS_COUNT = 3;

export function MomentsScreen() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const weeks = useMemo(
    () => recentWeeks(today, FULL_WEEKS_COUNT + COLLAPSED_WEEKS_COUNT, lang),
    [today, lang],
  );
  const [momentsByWeek, setMomentsByWeek] = useState<Record<number, Moment>>({});

  const reload = useCallback(async () => {
    const startKey = toDateKey(weeks[weeks.length - 1].start);
    const endKey = toDateKey(weeks[0].end);
    const items = await dayItemRepository.listByDateRange(startKey, endKey);
    const grouped: Record<number, Moment> = {};
    for (const item of items) {
      if (item.type === 'moment') grouped[item.weekOfYear] = item;
    }
    setMomentsByWeek(grouped);
  }, [weeks]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const handleAddPhoto = async (weekIndex: number) => {
    const saved = await pickMomentPhotoForWeek(weeks[weekIndex]);
    if (saved) reload();
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingHorizontal: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: palette.text }}>
            {t('momentsTitle')}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>
            {t('momentsSubtitle')}
          </Text>
        </View>

        <Text style={{ fontFamily: font.bold, fontSize: 22, color: palette.text }}>
          {MONTH_FULL[lang][today.getMonth()]}
        </Text>

        {weeks.map((week, i) =>
          i < FULL_WEEKS_COUNT ? (
            <MomentsWeekRow
              key={week.weekNumber}
              week={week}
              moment={momentsByWeek[week.weekNumber] ?? null}
              onAddPhoto={() => handleAddPhoto(i)}
            />
          ) : (
            <MomentsCollapsedWeekRow key={week.weekNumber} week={week} />
          ),
        )}
      </ScrollView>

      <FloatingBar
        onAddPress={() => handleAddPhoto(0)}
        onMenuPress={() => useNavigateMenuStore.getState().open()}
        center={
          <View style={styles.pill}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('momentsTitle')}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: palette.textDim }}>
              {MONTH_FULL[lang][today.getMonth()]}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 32, paddingTop: 12, paddingBottom: 160 },
  pill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
