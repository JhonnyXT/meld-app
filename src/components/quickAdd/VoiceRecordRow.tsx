import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';

interface VoiceRecordRowProps {
  isRecording: boolean;
  durationSeconds: number;
  hasRecording: boolean;
  onPress: () => void;
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VoiceRecordRow({ isRecording, durationSeconds, hasRecording, onPress }: VoiceRecordRowProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  const label = isRecording
    ? t('recording', { time: formatSeconds(durationSeconds) })
    : hasRecording
      ? t('recorded')
      : t('tapToRecord');

  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: palette.border }]}>
      <View style={styles.left}>
        <Icon name={isRecording ? 'stop' : 'mic'} size={20} color={isRecording ? palette.accent : palette.textDim} />
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: palette.text }}>
          {isRecording || !hasRecording ? label : t('recorded')}
        </Text>
      </View>
      {hasRecording && !isRecording ? (
        <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim }}>
          {formatSeconds(durationSeconds)}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
