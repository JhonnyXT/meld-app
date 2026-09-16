import { useCallback } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);

  const start = useCallback(async (): Promise<boolean> => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [recorder]);

  const stop = useCallback(async (): Promise<{ uri: string; durationSeconds: number } | null> => {
    const durationSeconds = state.durationMillis / 1000;
    await recorder.stop();
    if (!recorder.uri) return null;
    return { uri: recorder.uri, durationSeconds };
  }, [recorder, state.durationMillis]);

  // Pausar/reanudar sin cortar la grabación — mismo `AudioRecorder` nativo,
  // `pause()` la congela y volver a llamar `record()` la retoma donde quedó
  // (no hace falta `prepareToRecordAsync` de nuevo). Ver diseño de "Nota de
  // voz" en Quick Add — pedido explícito del usuario (2026-09-11).
  const pause = useCallback(() => {
    recorder.pause();
  }, [recorder]);

  const resume = useCallback(() => {
    recorder.record();
  }, [recorder]);

  return {
    isRecording: state.isRecording,
    durationSeconds: state.durationMillis / 1000,
    start,
    pause,
    resume,
    stop,
  };
}
