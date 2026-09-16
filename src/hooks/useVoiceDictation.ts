import { useCallback, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import type { Language } from '@/i18n';

/** Dictado por voz para el campo de título de Quick Add/`ItemDetailSheet`
 * (botón de micrófono, agregado 2026-08-26 a pedido explícito). Reconoce en
 * el idioma actual de la app (`lang`) — distinto de `useVoiceRecorder`, que
 * graba audio crudo para el tipo Nota de voz; acá el resultado es texto que
 * reemplaza el título en vivo mientras se habla (`interimResults: true`,
 * `continuous: false` — se detiene sola al terminar la frase). */
export function useVoiceDictation(lang: Language, onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) onResult(transcript);
  });
  useSpeechRecognitionEvent('error', () => setListening(false));

  const toggle = useCallback(async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) return;
    ExpoSpeechRecognitionModule.start({
      lang: lang === 'es' ? 'es-ES' : 'en-US',
      interimResults: true,
      continuous: false,
    });
  }, [listening, lang]);

  return { listening, toggle };
}
