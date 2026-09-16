import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { QUICK_ADD_META, QUICK_ADD_TYPES, type QuickAddType } from '@/domain/quickAdd';

interface TypeTabsProps {
  value: QuickAddType;
  onChange: (type: QuickAddType) => void;
}

const COUNT = QUICK_ADD_TYPES.length;
const TRACK_PADDING = 6;
const TRACK_GAP = 4;

/** Switch de tipo — además de tocar un ícono, mantener presionado y arrastrar
 * a cualquier lado del track va seleccionando el tipo bajo el dedo en vivo
 * (agregado 2026-08-26 a pedido explícito, mismo espíritu que el swipe de
 * `DayBar` pero "de arrastre continuo" en vez de "de a un paso"). `minDistance(0)`
 * hace que el gesto arranque apenas se toca (no hace falta mover el dedo
 * primero) para que un toque simple siga funcionando igual que antes.
 *
 * La selección NO se pinta cambiando el `backgroundColor` de cada tab en
 * cada render (bug real reportado: durante el arrastre se veía "brusco" y el
 * pill activo perdía las esquinas redondeadas un frame sí y otro no, por el
 * recálculo de layout/estilo en cada índice). En cambio hay un único "Thumb"
 * (`Animated.View` absoluto, `pointerEvents="none"`) que se desliza con
 * `withTiming` a la posición del índice activo — mismo pill, misma forma,
 * solo se mueve. Los íconos van en una capa aparte encima, sin fondo propio,
 * solo cambian de color según estén debajo del thumb o no. */
export function TypeTabs({ value, onChange }: TypeTabsProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const trackWidth = useSharedValue(0);
  const activeIndex = useSharedValue(QUICK_ADD_TYPES.indexOf(value));

  useEffect(() => {
    activeIndex.value = withTiming(QUICK_ADD_TYPES.indexOf(value), {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, activeIndex]);

  const selectIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(COUNT - 1, index));
    const type = QUICK_ADD_TYPES[clamped];
    if (type !== value) onChange(type);
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      if (trackWidth.value <= 0) return;
      runOnJS(selectIndex)(Math.floor((e.x / trackWidth.value) * COUNT));
    })
    .onUpdate((e) => {
      if (trackWidth.value <= 0) return;
      runOnJS(selectIndex)(Math.floor((e.x / trackWidth.value) * COUNT));
    });

  const thumbStyle = useAnimatedStyle(() => {
    const slotWidth = (trackWidth.value - TRACK_GAP * (COUNT - 1)) / COUNT;
    return {
      width: Math.max(slotWidth, 0),
      transform: [{ translateX: activeIndex.value * (slotWidth + TRACK_GAP) }],
    };
  });

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={[styles.track, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
        <Animated.View pointerEvents="none" style={[styles.thumb, { backgroundColor: palette.accent }, thumbStyle]} />
        <GestureDetector gesture={gesture}>
          <View
            onLayout={(e: LayoutChangeEvent) => {
              trackWidth.value = e.nativeEvent.layout.width;
            }}
            style={styles.tabsRow}
          >
            {QUICK_ADD_TYPES.map((type) => {
              const active = type === value;
              return (
                <View
                  key={type}
                  style={styles.tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(QUICK_ADD_META[type].tabLabelKey)}
                >
                  <Icon name={QUICK_ADD_META[type].icon} size={22} color={active ? '#fff' : palette.textDim} />
                </View>
              );
            })}
          </View>
        </GestureDetector>
      </View>
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: palette.textDim, textAlign: 'center', marginTop: 8 }}>
        {t(QUICK_ADD_META[value].tabLabelKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: 20, padding: TRACK_PADDING, borderWidth: 1, position: 'relative' },
  thumb: { position: 'absolute', top: TRACK_PADDING, bottom: TRACK_PADDING, left: TRACK_PADDING, borderRadius: 16 },
  tabsRow: { flexDirection: 'row', gap: TRACK_GAP },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
