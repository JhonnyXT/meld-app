import { useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing } from 'react-native-reanimated';

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

/** Gesto de "arrastrar hacia abajo para cerrar" sobre el handle de una hoja
 * modal (`QuickAddSheet`/`ItemDetailSheet`/`CategoryFormModal` — mismo
 * patrón visual de handle + `Modal` `slide`). Pedido explícito del usuario
 * (2026-09-11): antes el handle era puramente decorativo, solo se cerraba
 * tocando la "X" o el backdrop. Soltar antes del umbral (`DISMISS_DISTANCE`)
 * o sin suficiente velocidad hace un `withSpring` de vuelta a 0, igual que
 * un bottom sheet nativo. `close` se llama recién cuando termina la
 * animación de salida (`runOnJS`, dentro del callback de `withTiming`) para
 * que no se note el corte — la hoja ya salió de pantalla para cuando el
 * `Modal` se desmonta. */
export function useSheetDragDismiss(visible: boolean, close: () => void) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [visible, translateY]);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(800, { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(close)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return { gesture, animatedStyle };
}
