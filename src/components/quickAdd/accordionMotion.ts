import { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

export const ACCORDION_LAYOUT = LinearTransition.duration(200);
export const ACCORDION_ENTER = FadeIn.duration(160);
export const ACCORDION_EXIT = FadeOut.duration(120);
