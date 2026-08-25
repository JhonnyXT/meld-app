import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { SwipeToDeleteCard } from './SwipeToDeleteCard';
import type { InboxRowViewModel } from '@/features/inbox/mapInboxItemToRow';

interface InboxItemRowProps {
  item: InboxRowViewModel;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  onScheduleToday?: () => void;
  /** Selección múltiple activa (ver InboxScreen) — reemplaza el círculo
   * punteado vacío por un checkbox real y desactiva el swipe-to-delete. */
  selectionMode?: boolean;
  selected?: boolean;
}

export function InboxItemRow({
  item,
  onPress,
  onLongPress,
  onDelete,
  onScheduleToday,
  selectionMode,
  selected,
}: InboxItemRowProps) {
  const { palette, font } = useTheme();

  const card = (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={selectionMode ? { selected: !!selected } : undefined}
      style={[styles.card, { backgroundColor: palette.surfaceLow }]}
    >
      <View style={styles.cardLeft}>
        <View
          style={[
            styles.iconRing,
            selectionMode
              ? {
                  borderStyle: 'solid',
                  borderColor: selected ? palette.accent : palette.textDim,
                  backgroundColor: selected ? palette.accent : 'transparent',
                }
              : { borderColor: palette.textDim },
          ]}
        >
          {selectionMode && selected ? <Icon name="check" size={16} color="#fff" /> : null}
        </View>
        <Text numberOfLines={1} style={[styles.title, { fontFamily: font.medium, color: palette.text }]}>
          {item.title}
        </Text>
      </View>
      {item.link && !selectionMode ? (
        <View style={styles.linkGroup}>
          <Icon name="description" size={15} color={palette.textDim} />
          <Pressable
            onPress={() => Linking.openURL(item.link!)}
            hitSlop={8}
            style={[styles.linkButton, { backgroundColor: palette.surfaceHigh }]}
          >
            <Icon name="north-east" size={13} color={palette.textDim} />
          </Pressable>
        </View>
      ) : (
        <Text style={{ fontFamily: font.semibold, fontSize: 12, color: palette.textDim }}>{item.relativeLabel}</Text>
      )}
    </Pressable>
  );

  return (
    <View style={styles.row}>
      <View style={[styles.handle, { backgroundColor: palette.textDim }]} />
      {onDelete && !selectionMode ? (
        <SwipeToDeleteCard onDelete={onDelete} onScheduleToday={onScheduleToday} borderRadius={12}>
          {card}
        </SwipeToDeleteCard>
      ) : (
        card
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  handle: { width: 24, height: 1, opacity: 0.5 },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 1 },
  iconRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, flexShrink: 1 },
  linkGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  linkButton: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
