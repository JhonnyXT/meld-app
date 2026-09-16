import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useVoiceMemoPlayer } from '@/hooks/useVoiceMemoPlayer';

interface VoiceRecorderHandle {
  isRecording: boolean;
  durationSeconds: number;
  start: () => Promise<boolean>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<{ uri: string; durationSeconds: number } | null>;
}

interface VoiceRecordRowProps {
  recorder: VoiceRecorderHandle;
  recordedUri: string | null;
  recordedSeconds: number;
  onRecorded: (uri: string, seconds: number) => void;
  onDelete: () => void;
  onPermissionDenied: () => void;
  onError: () => void;
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Barras decorativas de "waveform" — mismo criterio que el resto de la app
// (`DayItemRow`, ver "Reproducción de nota de voz" en CLAUDE.md): puramente
// visual, sin leer amplitud real del audio.
const WAVEFORM_BARS = [6, 14, 9, 18, 11, 16, 7, 13, 10, 15, 8, 12, 6, 14, 9];

/** Fila de "Nota de voz" en Quick Add/`ItemDetailSheet` — 3 estados en un
 * solo componente (pedido explícito del usuario, 2026-09-11, con referencia
 * visual):
 * 1. Inactiva: "Toca para grabar" (ícono mic).
 * 2. Grabando: card con punto pulsante + timer + Pausar/Reanudar + Detener.
 * 3. Grabada: fila de reproducción (▶ + waveform decorativo + duración +
 *    eliminar), igual en espíritu a como se reproduce una nota de voz ya
 *    guardada (`useVoiceMemoPlayer`).
 * El manejo de pausa/resume vive local acá (no en el padre) — el padre solo
 * necesita el resultado final (`onRecorded`) y poder descartarlo
 * (`onDelete`); mismo criterio que el resto de los campos de Quick Add,
 * donde el padre es la fuente de verdad solo de lo que se persiste. */
export function VoiceRecordRow({
  recorder,
  recordedUri,
  recordedSeconds,
  onRecorded,
  onDelete,
  onPermissionDenied,
  onError,
}: VoiceRecordRowProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);
  const player = useVoiceMemoPlayer(recordedUri ?? undefined);

  const inSession = recorder.isRecording || paused;

  const handleStart = async () => {
    try {
      const granted = await recorder.start();
      if (!granted) onPermissionDenied();
    } catch (error) {
      console.error('[VoiceRecordRow] start failed', error);
      onError();
    }
  };

  const handleTogglePause = () => {
    if (paused) {
      recorder.resume();
      setPaused(false);
    } else {
      recorder.pause();
      setPaused(true);
    }
  };

  const handleStop = async () => {
    try {
      const result = await recorder.stop();
      setPaused(false);
      if (result) onRecorded(result.uri, result.durationSeconds);
    } catch (error) {
      console.error('[VoiceRecordRow] stop failed', error);
      setPaused(false);
      onError();
    }
  };

  if (inSession) {
    return (
      <Animated.View entering={FadeIn.duration(150)} style={[styles.sessionCard, { backgroundColor: palette.surfaceHigh }]}>
        <View style={styles.sessionTop}>
          <View style={styles.sessionLeft}>
            <RecordingDot active={!paused} color={palette.danger} />
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.text }}>
              {t('voiceRecordingLabel')}
            </Text>
          </View>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.text, fontVariant: ['tabular-nums'] }}>
            {formatSeconds(recorder.durationSeconds)}
          </Text>
        </View>
        <View style={styles.sessionControls}>
          <Pressable
            onPress={handleTogglePause}
            style={[styles.controlBtn, { backgroundColor: palette.surface }]}
            accessibilityRole="button"
            accessibilityLabel={paused ? t('a11yResumeRecording') : t('a11yPauseRecording')}
          >
            <Icon name={paused ? 'play-arrow' : 'pause'} size={20} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={handleStop}
            style={[styles.controlBtn, styles.stopBtn, { backgroundColor: palette.danger }]}
            accessibilityRole="button"
            accessibilityLabel={t('a11yStopRecording')}
          >
            <Icon name="stop" size={20} color="#fff" />
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  if (recordedUri) {
    return (
      <Animated.View entering={FadeIn.duration(150)} style={[styles.playbackRow, { backgroundColor: palette.surfaceHigh }]}>
        <Pressable
          onPress={player.toggle}
          style={[styles.playBtn, { backgroundColor: palette.text }]}
          accessibilityRole="button"
          accessibilityLabel={t('a11yPlayRecording')}
        >
          <Icon name={player.isPlaying ? 'pause' : 'play-arrow'} size={18} color={palette.bg} />
        </Pressable>
        <View style={styles.waveform}>
          {WAVEFORM_BARS.map((h, i) => (
            <View key={i} style={[styles.waveformBar, { height: h, backgroundColor: palette.border }]} />
          ))}
        </View>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: palette.textDim }}>
          {formatSeconds(recordedSeconds)}
        </Text>
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={t('a11yDeleteRecording')}
        >
          <Icon name="delete-outline" size={18} color={palette.danger} />
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Pressable onPress={handleStart} style={[styles.row, { borderBottomColor: palette.border }]}>
      <View style={styles.left}>
        <Icon name="mic" size={20} color={palette.textDim} />
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: palette.text }}>{t('tapToRecord')}</Text>
      </View>
    </Pressable>
  );
}

/** Punto rojo pulsante — única señal de "grabando en vivo" además del timer.
 * Se congela (sin pulsar) mientras está en pausa. */
function RecordingDot({ active, color }: { active: boolean; color: string }) {
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    if (active) {
      pulse.value = withRepeat(withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [active, pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionCard: { borderRadius: 16, padding: 14, marginTop: 14, marginBottom: 16, gap: 14 },
  sessionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sessionControls: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  controlBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stopBtn: {},
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  playBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  waveformBar: { width: 3, borderRadius: 1.5 },
  deleteBtn: { padding: 4 },
});
