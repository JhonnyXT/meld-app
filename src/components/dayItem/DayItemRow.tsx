import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { SwipeToDeleteCard } from './SwipeToDeleteCard';

export type TimeMarker =
  | { kind: 'any' }
  | { kind: 'time'; hour: string; minute: string; meridiem: 'AM' | 'PM' }
  | { kind: 'dash' }
  | { kind: 'dragging'; hour: string; minute: string; meridiem: 'AM' | 'PM' };

export type Leading =
  | { kind: 'checkbox'; checked: boolean }
  | { kind: 'icon'; name: IconName }
  /** Tocable para marcar "hecho hoy" (a diferencia de 'icon', que es
   * decorativo en el resto de tipos) — ver `onToggleHabitComplete`.
   * `completed` es "hecho el día que se está viendo", independiente del
   * `completed` a nivel de fila (ese sigue significando "Task terminada",
   * con su propio dim/strike de toda la fila, que NO aplica a hábitos).
   * `healthIcon`, si está presente, se dibuja como un ícono chico aparte
   * JUNTO a este (no en su lugar) — es el hábito "de salud" con Auto-
   * registro, mostrando qué métrica es (footprints/bed/etc, ver
   * `domain/healthMetrics.ts`), fiel a la referencia del usuario. */
  | { kind: 'habitIcon'; name: IconName; completed: boolean; healthIcon?: IconName };

export type Trailing =
  | { kind: 'category'; color: string; label: string }
  | { kind: 'duration'; label: string }
  | { kind: 'progress'; label: string }
  | { kind: 'favorite' }
  | { kind: 'playback'; label: string; isPlaying: boolean; onPress: () => void };

export interface PlaybackExpanded {
  elapsedLabel: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onDelete: () => void;
  onClose: () => void;
}

interface DayItemRowProps {
  timeMarker: TimeMarker;
  leading: Leading;
  title: string;
  trailing?: Trailing;
  hasLink?: boolean;
  completed?: boolean;
  onPress?: () => void;
  onToggleComplete?: () => void;
  onToggleHabitComplete?: () => void;
  onLinkPress?: () => void;
  onDashPress?: () => void;
  /** Cuando está presente, la card reemplaza icono+título por la barra de
   * controles de reproducción (ver `onTogglePlay` en el trailing 'playback'). */
  playbackExpanded?: PlaybackExpanded;
  /** Cuando está presente, deslizar la card a la izquierda revela un botón
   * de eliminar a la derecha (no aplica mientras `playbackExpanded` está activo). */
  onDelete?: () => void;
}

export function DayItemRow({
  timeMarker,
  leading,
  title,
  trailing,
  hasLink,
  completed,
  onPress,
  onToggleComplete,
  onToggleHabitComplete,
  onLinkPress,
  onDashPress,
  playbackExpanded,
  onDelete,
}: DayItemRowProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();

  return (
    // needsOffscreenAlphaCompositing evita que, en Android, la opacity de una fila
    // completada "transparente" el botón de eliminar detrás de la card cuando hay
    // swipe (RN aplica alpha por-capa en vez de componer el subárbol primero).
    <View style={[styles.row, completed && styles.rowCompleted]} needsOffscreenAlphaCompositing={completed}>
      <Pressable
        onPress={timeMarker.kind === 'dash' ? onDashPress : undefined}
        style={styles.timeColumn}
        hitSlop={8}
        accessibilityRole={timeMarker.kind === 'dash' ? 'button' : undefined}
        accessibilityLabel={timeMarker.kind === 'dash' ? t('a11yAssignTime') : undefined}
      >
        <TimeMarkerView
          marker={timeMarker}
          color={palette.textDim}
          accent={palette.accent}
          accentSoft={palette.accentSoft}
          monoFont={font.mono}
        />
      </Pressable>
      {playbackExpanded ? (
        <View style={[styles.card, styles.playbackCard, { backgroundColor: palette.surfaceLow }]}>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: palette.textDim }}>
            {playbackExpanded.elapsedLabel}
          </Text>
          <View style={styles.waveform} pointerEvents="none">
            {Array.from({ length: 16 }).map((_, i) => (
              <View key={i} style={[styles.waveDot, { backgroundColor: palette.border }]} />
            ))}
          </View>
          <Pressable
            onPress={playbackExpanded.onDelete}
            hitSlop={8}
            style={[styles.playbackIconBtn, { backgroundColor: palette.surface }]}
            accessibilityRole="button"
            accessibilityLabel={t('a11yDeleteAudio')}
          >
            <Icon name="delete-outline" size={18} color={palette.danger} />
          </Pressable>
          <Pressable
            onPress={playbackExpanded.onTogglePlay}
            hitSlop={8}
            style={[styles.playButtonLg, { backgroundColor: palette.accent }]}
            accessibilityRole="button"
            accessibilityLabel={playbackExpanded.isPlaying ? t('a11yPause') : t('a11yPlay')}
          >
            <Icon name={playbackExpanded.isPlaying ? 'pause' : 'play-arrow'} size={18} color="#fff" />
          </Pressable>
          <Pressable
            onPress={playbackExpanded.onClose}
            hitSlop={8}
            style={[styles.playbackIconBtn, { backgroundColor: palette.surface }]}
            accessibilityRole="button"
            accessibilityLabel={t('a11yClosePlayback')}
          >
            <Icon name="close" size={18} color={palette.textDim} />
          </Pressable>
        </View>
      ) : (
        <CardContent
          content={
            <Pressable onPress={onPress} style={[styles.card, styles.cardFlush, { backgroundColor: palette.surfaceLow }]}>
              <View style={styles.cardLeft}>
                <LeadingView
                  leading={leading}
                  completed={!!completed}
                  accent={palette.accent}
                  border={palette.border}
                  dim={palette.textDim}
                  onPress={
                    leading.kind === 'checkbox'
                      ? onToggleComplete
                      : leading.kind === 'habitIcon'
                        ? onToggleHabitComplete
                        : undefined
                  }
                />
                {leading.kind === 'habitIcon' && leading.healthIcon ? (
                  <Icon name={leading.healthIcon} size={16} color={palette.textDim} />
                ) : null}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.title,
                    { fontFamily: font.medium, color: completed ? palette.textFaint : palette.text },
                    completed && styles.strike,
                  ]}
                >
                  {title}
                </Text>
              </View>
              <View style={styles.cardRight}>
                {trailing ? <TrailingView trailing={trailing} accent={palette.accent} dim={palette.textDim} font={font.semibold} /> : null}
                {hasLink ? (
                  <Pressable
                    onPress={onLinkPress}
                    hitSlop={8}
                    style={[styles.linkButton, { backgroundColor: palette.surfaceHigh }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('a11yOpenLink')}
                  >
                    <Icon name="north-east" size={14} color={palette.textDim} />
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          }
          onDelete={onDelete}
        />
      )}
    </View>
  );
}

function CardContent({ content, onDelete }: { content: React.ReactNode; onDelete?: () => void }) {
  if (!onDelete) {
    return <View style={styles.cardWrapper}>{content}</View>;
  }
  return (
    <SwipeToDeleteCard onDelete={onDelete} borderRadius={16} style={styles.cardWrapper}>
      {content}
    </SwipeToDeleteCard>
  );
}

function TimeMarkerView({
  marker,
  color,
  accent,
  accentSoft,
  monoFont,
}: {
  marker: TimeMarker;
  color: string;
  accent: string;
  accentSoft: string;
  monoFont: string;
}) {
  if (marker.kind === 'any') {
    return <Icon name="notifications" size={16} color={color} />;
  }
  if (marker.kind === 'dash') {
    return <View style={[styles.dash, { backgroundColor: color }]} />;
  }
  if (marker.kind === 'dragging') {
    return (
      <View style={[styles.dragPill, { backgroundColor: accentSoft }]}>
        <View>
          <Text style={{ fontFamily: monoFont, fontSize: 15, color: accent }}>{marker.hour}</Text>
          <Text style={{ fontFamily: monoFont, fontSize: 9, color: accent, marginTop: -2 }}>
            {marker.minute}
            {'\n'}
            <Text style={{ fontSize: 7, textTransform: 'uppercase' }}>{marker.meridiem}</Text>
          </Text>
        </View>
        <View style={styles.dragChevrons}>
          <Icon name="chevron-up" size={13} color={accent} style={{ opacity: 0.6, marginBottom: -4 }} />
          <Icon name="chevron-down" size={13} color={accent} style={{ opacity: 0.6 }} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: monoFont, fontSize: 18, letterSpacing: -0.5, color, textAlign: 'center' }}>
        {marker.hour}
      </Text>
      <Text style={{ fontFamily: monoFont, fontSize: 10, color, textAlign: 'center' }}>
        {marker.minute}
        {'\n'}
        <Text style={{ fontSize: 8, textTransform: 'uppercase' }}>{marker.meridiem}</Text>
      </Text>
    </View>
  );
}

function LeadingView({
  leading,
  completed,
  accent,
  border,
  dim,
  onPress,
}: {
  leading: Leading;
  completed: boolean;
  accent: string;
  border: string;
  dim: string;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  if (leading.kind === 'checkbox') {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.checkBox,
          { borderColor: completed ? accent : border, backgroundColor: completed ? accent : 'transparent' },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={t('a11yToggleComplete')}
      >
        <Icon name="check" size={16} color={completed ? '#fff' : dim} />
      </Pressable>
    );
  }
  if (leading.kind === 'habitIcon') {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.checkBox,
          { borderColor: leading.completed ? accent : border, backgroundColor: leading.completed ? accent : 'transparent' },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: leading.completed }}
        accessibilityLabel={t('a11yToggleHabitComplete')}
      >
        <Icon name={leading.completed ? 'check' : leading.name} size={leading.completed ? 16 : 14} color={leading.completed ? '#fff' : dim} />
      </Pressable>
    );
  }
  return (
    <View style={[styles.checkBox, { borderColor: border }]}>
      <Icon name={leading.name} size={14} color={dim} />
    </View>
  );
}

function TrailingView({ trailing, accent, dim, font }: { trailing: Trailing; accent: string; dim: string; font: string }) {
  if (trailing.kind === 'category') {
    return (
      <View style={styles.trailingRow}>
        <View style={[styles.dot, { backgroundColor: trailing.color }]} />
        <Text style={{ fontFamily: font, fontSize: 12, color: dim }}>{trailing.label}</Text>
      </View>
    );
  }
  if (trailing.kind === 'favorite') {
    return <Icon name="favorite" size={14} color={accent} />;
  }
  if (trailing.kind === 'playback') {
    return (
      <Pressable onPress={trailing.onPress} hitSlop={8} style={styles.playbackRow} accessibilityRole="button">
        <View style={[styles.playButton, { backgroundColor: accent }]}>
          <Icon name={trailing.isPlaying ? 'pause' : 'play-arrow'} size={14} color="#fff" />
        </View>
        <Text style={{ fontFamily: font, fontSize: 12, color: dim }}>{trailing.label}</Text>
      </Pressable>
    );
  }
  return <Text style={{ fontFamily: font, fontSize: 12, color: dim }}>{trailing.label}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 68 },
  rowCompleted: { opacity: 0.6 },
  timeColumn: { width: 56, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  dash: { width: 16, height: 2, borderRadius: 1 },
  dragPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 58,
  },
  dragChevrons: { alignItems: 'center' },
  cardWrapper: { flex: 1, marginLeft: 16 },
  cardFlush: { marginLeft: 0 },
  card: {
    flex: 1,
    marginLeft: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playbackCard: { gap: 10 },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, overflow: 'hidden' },
  waveDot: { width: 3, height: 3, borderRadius: 1.5 },
  playbackIconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  playButtonLg: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, flexShrink: 1 },
  strike: { textDecorationLine: 'line-through' },
  trailingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  linkButton: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  playbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playButton: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
