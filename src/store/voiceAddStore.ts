import { create } from 'zustand';

/** Pantalla full-screen de dictado de un registro por voz
 * (`components/voiceAdd/VoiceAddScreen.tsx`). Al terminar de escuchar,
 * `parseVoiceInput` arma un `VoicePrefill` y se abre Quick Add pre-llenado
 * vía `quickAddStore.openWithPrefill`. */
interface VoiceAddState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useVoiceAddStore = create<VoiceAddState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
