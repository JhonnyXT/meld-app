import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useVoiceAddStore } from '@/store/voiceAddStore';
import { useQuickAddStore } from '@/store/quickAddStore';
import { parseVoiceInput } from '@/domain/voiceParser';

const BG = '#121212';
const GLOW_SIZE = 300;
const SILENCE_MS = 2000;

type Status = 'listening' | 'processing' | 'error';

/** Pantalla full-screen de dictado (long-press FAB → "Por voz"). Escucha con
 * `expo-speech-recognition`, muestra la transcripción en vivo, y a los 2s de
 * silencio (o al terminar la frase) corre `parseVoiceInput` y abre Quick Add
 * pre-llenado. El audio no se graba: solo la transcripción, en el
 * dispositivo. Montada una sola vez en `app/_layout.tsx`. */
export function VoiceAddScreen() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const visible = useVoiceAddStore((s) => s.visible);
  const close = useVoiceAddStore((s) => s.close);

  const [status, setStatus] = useState<Status>('listening');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const transcriptRef = useRef('');
  const statusRef = useRef<Status>('listening');
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* ignore */
    }
  }, [clearSilenceTimer]);

  const handleClose = useCallback(() => {
    stopListening();
    setTranscript('');
    setErrorMsg(null);
    close();
  }, [stopListening, close]);

  const finish = useCallback(() => {
    const text = transcriptRef.current.trim();
    if (!text) {
      handleClose();
      return;
    }
    setStatus('processing');
    statusRef.current = 'processing';
    // Un respiro para que se vea el estado "Analizando…" antes de saltar.
    setTimeout(() => {
      const prefill = parseVoiceInput(text, lang);
      useQuickAddStore.getState().openWithPrefill(prefill);
      setTranscript('');
      setErrorMsg(null);
      close();
    }, 450);
  }, [lang, close, handleClose]);

  const startListening = useCallback(async () => {
    setErrorMsg(null);
    setTranscript('');
    transcriptRef.current = '';
    setStatus('listening');
    statusRef.current = 'listening';
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setStatus('error');
        setErrorMsg(t('voiceAddPermission'));
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      ExpoSpeechRecognitionModule.start({
        lang: lang === 'es' ? 'es-ES' : 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch {
      setStatus('error');
      setErrorMsg(t('voiceAddError'));
    }
  }, [lang, t]);

  // Arrancar/cortar la escucha al abrir/cerrar la pantalla.
  useEffect(() => {
    if (visible) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useSpeechRecognitionEvent('result', (event) => {
    if (!visible) return;
    const text = event.results?.[0]?.transcript ?? '';
    if (!text) return;
    setTranscript(text);
    transcriptRef.current = text;
    if (event.isFinal) {
      finish();
    } else {
      clearSilenceTimer();
      silenceTimer.current = setTimeout(() => stopListening(), SILENCE_MS);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (!visible) return;
    if (statusRef.current !== 'processing') finish();
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!visible) return;
    clearSilenceTimer();
    setStatus('error');
    setErrorMsg(event?.message || t('voiceAddError'));
  });

  const isProcessing = status === 'processing';
  const isError = status === 'error';

  const statusLabel = isError
    ? (errorMsg ?? t('voiceAddError'))
    : isProcessing
      ? t('voiceAddProcessing')
      : transcript
        ? t('voiceAddListening')
        : t('voiceAddHint');

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button">
            <Icon name="close" size={20} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        <View style={styles.center}>
          <Orb active={status === 'listening'} accent={palette.accent} />

          <Text style={[styles.transcript, { fontFamily: font.bold }]} numberOfLines={4}>
            {transcript ? `"${transcript}"` : ''}
          </Text>
          <Text style={[styles.status, { fontFamily: font.medium }, isError && styles.statusError]}>{statusLabel}</Text>
        </View>

        <View style={styles.footer}>
          {isError ? (
            <Pressable onPress={startListening} style={[styles.retryBtn, { backgroundColor: palette.accent }]}>
              <Icon name="mic" size={20} color="#fff" />
              <Text style={{ fontFamily: font.bold, fontSize: 15, color: '#fff' }}>{t('voiceAddRetry')}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={status === 'listening' ? stopListening : startListening}
              style={[styles.micBtn, { backgroundColor: palette.accent }]}
              accessibilityRole="button"
              accessibilityLabel={t('a11yVoiceAdd')}
            >
              <Icon name={status === 'listening' ? 'stop' : 'mic'} size={28} color="#fff" />
            </Pressable>
          )}
          <Text style={[styles.footerHint, { fontFamily: font.medium }]}>
            {status === 'listening' ? t('voiceAddTapToStop') : t('voiceAddTapToStart')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

/** Orbe con dos anillos que laten mientras escucha + un glow radial detrás
 * (mismo patrón de `RadialGradient` que `AnimatedSplash`, no un disco plano). */
function Orb({ active, accent }: { active: boolean; accent: string }) {
  const pulse1 = useSharedValue(1);
  const pulse2 = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pulse1.value = withRepeat(withTiming(1.18, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
      pulse2.value = withRepeat(withTiming(1.32, { duration: 1300, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      pulse1.value = withTiming(1, { duration: 300 });
      pulse2.value = withTiming(1, { duration: 300 });
    }
  }, [active, pulse1, pulse2]);

  const ring1 = useAnimatedStyle(() => ({ transform: [{ scale: pulse1.value }], opacity: active ? 0.4 : 0.16 }));
  const ring2 = useAnimatedStyle(() => ({ transform: [{ scale: pulse2.value }], opacity: active ? 0.22 : 0.08 }));

  return (
    <View style={styles.orbWrap}>
      <Svg width={GLOW_SIZE} height={GLOW_SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="voiceGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity={0.45} />
            <Stop offset="55%" stopColor={accent} stopOpacity={0.14} />
            <Stop offset="100%" stopColor={accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#voiceGlow)" />
      </Svg>
      <Animated.View style={[styles.ring, { borderColor: accent }, ring2]} />
      <Animated.View style={[styles.ring, styles.ringInner, { borderColor: accent }, ring1]} />
      <View style={[styles.orbCore, { backgroundColor: accent }]}>
        <Icon name="mic" size={44} color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, paddingHorizontal: 24 },
  header: { flexDirection: 'row', justifyContent: 'flex-start' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  orbWrap: { width: GLOW_SIZE, height: GLOW_SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
  },
  ringInner: { width: 132, height: 132, borderRadius: 66 },
  orbCore: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  transcript: {
    fontSize: 22,
    lineHeight: 30,
    color: '#fff',
    textAlign: 'center',
    minHeight: 30,
  },
  status: { fontSize: 14, color: '#9A9A9E', textAlign: 'center' },
  statusError: { color: '#F87171' },
  footer: { alignItems: 'center', gap: 14 },
  micBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
  },
  footerHint: { fontSize: 12, letterSpacing: 1.4, color: '#64646A', textTransform: 'uppercase' },
});
