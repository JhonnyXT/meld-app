import { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

/** Transición compartida por los acordeones inline de Quick Add/
 * `ItemDetailSheet` (`PresetFieldRow`, `CategoryChips`, `PriorityTabs`) —
 * agregado 2026-08-26 a pedido explícito ("transición profesional y
 * limpia"), antes se mostraban/ocultaban de golpe sin animación. Mismo
 * patrón de Reanimated que ya usa el resto de la app (p. ej.
 * `TodayScreen.ROW_TRANSITION`) — no inventar un mecanismo nuevo si se
 * agrega otro acordeón. */
export const ACCORDION_LAYOUT = LinearTransition.duration(200);
export const ACCORDION_ENTER = FadeIn.duration(160);
export const ACCORDION_EXIT = FadeOut.duration(120);
