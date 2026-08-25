import React, { memo, useCallback, useRef } from 'react';
import { FlatList, Pressable, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;
export const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface WheelColumnProps {
  values: number[];
  selectedValue: number;
  onSelect: (value: number) => void;
  format: (value: number) => string;
  accent?: boolean;
  width?: number;
}

const getItemLayout = (_data: ArrayLike<number> | null | undefined, index: number) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});

const keyExtractor = (value: number) => String(value);

export const WheelColumn = memo(function WheelColumn({
  values,
  selectedValue,
  onSelect,
  format,
  accent,
  width = 64,
}: WheelColumnProps) {
  const { palette, font } = useTheme();
  const listRef = useRef<FlatList<number>>(null);
  const initialIndex = Math.max(0, values.indexOf(selectedValue));

  const selectIndex = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  // `initialScrollIndex` a veces no aplica el offset correcto en el primer
  // frame en Android — se re-aplica sin animación una vez que el contenido
  // termina de medirse, para evitar que la columna aparezca vacía/desalineada
  // al abrir el picker.
  const didInitialScroll = useRef(false);
  const onContentSizeChange = useCallback(() => {
    if (didInitialScroll.current) return;
    didInitialScroll.current = true;
    listRef.current?.scrollToOffset({ offset: initialIndex * ITEM_HEIGHT, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(values.length - 1, index));
      const value = values[clamped];
      if (value !== selectedValue) onSelect(value);
    },
    [values, selectedValue, onSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: number }) => {
      const selected = item === selectedValue;
      return (
        <Pressable
          onPress={() => selectIndex(values.indexOf(item))}
          style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            style={{
              fontFamily: selected ? font.bold : font.regular,
              fontSize: selected ? 20 : 17,
              color: selected ? (accent ? palette.accent : palette.text) : palette.textDim,
              opacity: selected ? 1 : 0.45,
            }}
          >
            {format(item)}
          </Text>
        </Pressable>
      );
    },
    [selectedValue, accent, format, selectIndex, values, palette, font],
  );

  return (
    <View style={{ height: WHEEL_HEIGHT, width }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          borderRadius: 12,
          backgroundColor: accent ? palette.accentSoft : palette.surfaceLow,
        }}
      />
      <FlatList
        ref={listRef}
        data={values}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onContentSizeChange={onContentSizeChange}
        maxToRenderPerBatch={values.length}
        initialNumToRender={values.length}
        windowSize={11}
      />
    </View>
  );
});
