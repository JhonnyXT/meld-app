import React from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import type { Moment } from '@/domain/dayItem';

const CARD_SIZE = { width: 132, height: 168 };

interface MomentsDayRowProps {
  label: string;
  photos: Moment[];
  canAdd?: boolean;
  onAddPhoto?: () => void;
  onPressPhoto?: (m: Moment) => void;
}

export function MomentsDayRow({
  label,
  photos,
  canAdd = false,
  onAddPhoto,
  onPressPhoto,
}: MomentsDayRowProps) {
  const { palette, font } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={{ fontFamily: font.bold, fontSize: 16, color: palette.text }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {canAdd ? (
          <Pressable
            onPress={onAddPhoto}
            style={[styles.card, styles.addCard, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}
            accessibilityRole="button"
          >
            <Icon name="add" size={26} color={palette.textDim} />
          </Pressable>
        ) : null}
        {photos.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => onPressPhoto?.(m)}
            accessibilityRole="imagebutton"
          >
            <Image
              source={{ uri: m.mediaUri }}
              style={[styles.card, { backgroundColor: palette.surfaceLow }]}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  strip: { gap: 10 },
  card: { width: CARD_SIZE.width, height: CARD_SIZE.height, borderRadius: 16 },
  addCard: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed' },
});
