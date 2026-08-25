import React from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import type { WeekInfo } from '@/domain/week';
import type { Moment } from '@/domain/dayItem';

const CARD_SIZE = { width: 128, height: 160 };

interface MomentsWeekRowProps {
  week: WeekInfo;
  moment: Moment | null;
  onAddPhoto: () => void;
}

export function MomentsWeekRow({ week, moment, onAddPhoto }: MomentsWeekRowProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const cards = moment ? [{ kind: 'photo' as const, moment }, { kind: 'add' as const }] : [{ kind: 'add' as const }];

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('weekNumber', { n: week.weekNumber })}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: palette.textDim }}>{week.label}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {cards.map((card, i) => {
          const isFirst = i === 0;
          const isLast = i === cards.length - 1;
          const radiusStyle = {
            borderTopLeftRadius: isFirst ? 16 : 0,
            borderBottomLeftRadius: isFirst ? 16 : 0,
            borderTopRightRadius: isLast ? 16 : 0,
            borderBottomRightRadius: isLast ? 16 : 0,
          };
          if (card.kind === 'photo') {
            return (
              <Image
                key="photo"
                source={{ uri: card.moment.mediaUri }}
                style={[styles.card, radiusStyle, { backgroundColor: palette.surface }]}
              />
            );
          }
          return (
            <Pressable
              key="add"
              onPress={onAddPhoto}
              style={[styles.card, styles.addCard, radiusStyle, { backgroundColor: palette.surface }]}
            >
              <Icon name="add" size={24} color={palette.textDim} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  strip: { gap: 2 },
  card: { width: CARD_SIZE.width, height: CARD_SIZE.height },
  addCard: { alignItems: 'center', justifyContent: 'center' },
});
