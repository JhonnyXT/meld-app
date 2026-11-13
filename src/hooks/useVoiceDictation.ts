import { useCallback, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import type { Language } from '@/i18n';

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
