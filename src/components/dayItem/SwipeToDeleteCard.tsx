import React from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';

const DELETE_WIDTH = 72;
const OPEN_THRESHOLD = 48;
const SCHEDULE_WIDTH = 96;
const SCHEDULE_OPEN_THRESHOLD = 56;
const SPRING = { damping: 20, stiffness: 220 };

interface SwipeToDeleteCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  /** Si se pasa, deslizar la fila hacia la DERECHA (desde el borde izquierdo)
   * revela un botón verde "Hoy" que la agenda para hoy — usado en Inbox. */
  onScheduleToday?: () => void;
}

/** Envuelve una fila para que deslizar a la izquierda revele un botón de
 * eliminar a la derecha (mismo patrón que "my-wallet-app"), y opcionalmente
 * deslizar a la derecha revele un botón "Hoy" a la izquierda. Tocar el botón
 * de eliminar borra directo (sin confirmar antes) — la red de seguridad es el
 * snackbar "Deshacer" global (`useUndoStore`), no un diálogo previo. */
export function SwipeToDeleteCard({ children, onDelete, borderRadius = 12, style, onScheduleToday }: SwipeToDeleteCardProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const maxRight = onScheduleToday ? SCHEDULE_WIDTH : 0;

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      translateX.value = Math.max(-DELETE_WIDTH, Math.min(maxRight, startX.value + e.translationX));
    })
    .onEnd((e) => {
      if (translateX.value > 0) {
        const openEnough = translateX.value > SCHEDULE_OPEN_THRESHOLD || e.velocityX > 600;
        translateX.value = withSpring(0, SPRING);
        if (openEnough && onScheduleToday) runOnJS(onScheduleToday)();
        return;
      }
      const openEnough = translateX.value < -OPEN_THRESHOLD || e.velocityX < -600;
      translateX.value = withSpring(openEnough ? -DELETE_WIDTH : 0, SPRING);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // El fondo (basura/"Hoy") es un hermano absoluto de la card animada, no un
  // recorte de ella — sin esto queda potencialmente visible un frame antes de
  // que `animatedCard` reciba su layout (flex:1 mide 0 en el primer frame),
  // lo que se ve como un flash del ícono de basura al remontar filas (p. ej.
  // al pasar rápido de día en día en Today). Atarle la opacidad al progreso
  // real del swipe lo mantiene invisible hasta que el usuario desliza de
  // verdad, sin depender de que la card ya la esté cubriendo.
  const deleteBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-DELETE_WIDTH, 0], [1, 0], Extrapolation.CLAMP),
  }));
  const scheduleBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SCHEDULE_OPEN_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.wrapper, { borderRadius }, style]}>
      <Animated.View style={[styles.deleteContainer, deleteBgStyle]}>
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={[styles.deleteBtn, { backgroundColor: palette.danger }]}
          accessibilityRole="button"
          accessibilityLabel={t('a11yDeleteItem')}
        >
          <Icon name="delete-outline" size={20} color="#fff" />
        </Pressable>
      </Animated.View>
      {onScheduleToday ? (
        <Animated.View style={[styles.scheduleContainer, scheduleBgStyle]}>
          <View style={[styles.scheduleBtn, { backgroundColor: palette.success }]}>
            <Icon name="check" size={16} color="#fff" />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: '#fff' }}>{t('today')}</Text>
          </View>
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.animatedCard, cardStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'hidden', flex: 1 },
  deleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  scheduleContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SCHEDULE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 9999,
  },
  animatedCard: { flex: 1 },
});
