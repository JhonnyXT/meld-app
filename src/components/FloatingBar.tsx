import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useTimeDragStore } from '@/store/timeDragStore';
import { useUndoStore, UNDO_DURATION_MS } from '@/store/undoStore';
import { minutesToLabel, formatDelta } from '@/domain/time';
import { FLOATING_BAR_MARGIN, FLOATING_BAR_HEIGHT, FLOATING_BAR_CONFIRM_ROW_HEIGHT } from './floatingBarGeometry';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface FloatingBarProps {
  center: React.ReactNode;
  onMenuPress?: () => void;
  onAddPress?: () => void;
  fabSize?: number;
  barRadius?: number;
  centerStyle?: StyleProp<ViewStyle>;
  /** Ícono/color del botón izquierdo — por defecto "menu"/texto. Inbox lo
   * cambia a "close" mientras hay selección múltiple activa (cancelar). */
  menuIcon?: IconName;
  /** Ícono/color del FAB derecho — por defecto "add"/accent. Inbox lo cambia
   * a "delete-outline"/danger mientras hay selección múltiple activa. */
  fabIcon?: IconName;
  fabColor?: string;
  /** Labels de accesibilidad para los dos botones solo-ícono — por defecto
   * "Navegar"/"Agregar elemento"; Inbox los pisa a "Cancelar"/"Eliminar
   * elemento" durante la selección múltiple. */
  menuLabel?: string;
  fabLabel?: string;
}

/** Esqueleto compartido de la barra flotante inferior: menú, contenido central, FAB.
 * Mientras hay un arrastre de hora activo (`useTimeDragStore`), se estira hacia
 * arriba para mostrar además la fila de confirmación de hora, en vez de flotar
 * como una barra aparte por encima (se superponía con esta). */
export function FloatingBar({
  center,
  onMenuPress,
  onAddPress,
  fabSize = 56,
  barRadius = 16,
  centerStyle,
  menuIcon = 'menu',
  fabIcon = 'add',
  fabColor,
  menuLabel,
  fabLabel,
}: FloatingBarProps) {
  const { palette } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dragging = useTimeDragStore((s) => s.active);
  const undoVisible = useUndoStore((s) => s.visible);

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, FLOATING_BAR_MARGIN) }]} pointerEvents="box-none">
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: barRadius }]}>
        {dragging ? (
          <>
            <TimeConfirmRow />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
          </>
        ) : undoVisible ? (
          <>
            <UndoRow />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
          </>
        ) : null}
        <View style={styles.bar}>
          <Pressable
            onPress={onMenuPress}
            style={styles.iconButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={menuLabel ?? t('navigate')}
          >
            <Icon name={menuIcon} size={24} color={palette.text} />
          </Pressable>

          <View style={[styles.centerSlot, centerStyle]}>{center}</View>

          <Pressable
            onPress={onAddPress}
            style={[styles.fab, { backgroundColor: fabColor ?? palette.accent, width: fabSize, height: fabSize }]}
            accessibilityRole="button"
            accessibilityLabel={fabLabel ?? t('a11yAddItem')}
          >
            <Icon name={fabIcon} size={fabSize >= 56 ? 28 : 24} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function TimeConfirmRow() {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const currentMinutes = useTimeDragStore((s) => s.currentMinutes);
  const initialMinutes = useTimeDragStore((s) => s.initialMinutes);
  const close = useTimeDragStore((s) => s.close);
  const confirm = useTimeDragStore((s) => s.confirm);
  const delta = currentMinutes - initialMinutes;

  return (
    <View style={styles.confirmRow}>
      <Icon name="schedule" size={18} color={palette.accent} />
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.text }}>
        {minutesToLabel(currentMinutes)}
      </Text>
      {delta !== 0 ? (
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim }}>{formatDelta(delta)}</Text>
      ) : null}
      <View style={{ flex: 1 }} />
      <Pressable onPress={close} style={[styles.iconBtn, { backgroundColor: palette.surfaceLow }]}>
        <Icon name="close" size={18} color={palette.textDim} />
      </Pressable>
      <Pressable onPress={confirm} style={[styles.confirmBtn, { backgroundColor: palette.accent }]}>
        <Icon name="check" size={16} color="#fff" />
        <Text style={{ fontFamily: font.semibold, fontSize: 14, color: '#fff' }}>{t('confirm')}</Text>
      </Pressable>
    </View>
  );
}

const RING_SIZE = 28;
const RING_RADIUS = 12;
const RING_STROKE = 2.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Fila interna de "Deshacer" — mismo patrón que `TimeConfirmRow` (FloatingBar
 * se estira hacia arriba en vez de flotar una card aparte, ver CLAUDE.md →
 * "Undo real"). El anillo se rellena en sentido horario durante los mismos
 * `UNDO_DURATION_MS` que el snackbar queda visible, para que el usuario vea
 * cuánto tiempo le queda para tocar "Deshacer". */
function UndoRow() {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const message = useUndoStore((s) => s.message);
  const icon = useUndoStore((s) => s.icon);
  const visible = useUndoStore((s) => s.visible);
  const undo = useUndoStore((s) => s.undo);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: UNDO_DURATION_MS, easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, message]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  const iconColor = icon === 'delete-outline' ? palette.danger : palette.accent;

  return (
    <View style={styles.confirmRow}>
      <View style={styles.undoRing}>
        <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={palette.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={iconColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            animatedProps={ringProps}
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.undoRingIcon}>
          <Icon name={icon} size={13} color={iconColor} />
        </View>
      </View>
      <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 14, color: palette.text, flex: 1 }}>
        {message}
      </Text>
      <Pressable
        onPress={undo}
        style={[styles.undoBtn, { backgroundColor: palette.surfaceLow }]}
        accessibilityRole="button"
      >
        <Icon name="undo" size={14} color={palette.text} />
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: palette.text }}>{t('undo')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  divider: { height: 1, marginHorizontal: 14, opacity: 0.6 },
  bar: {
    height: FLOATING_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  confirmRow: {
    height: FLOATING_BAR_CONFIRM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  centerSlot: { flex: 1, height: 48 },
  fab: { borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginLeft: 8,
  },
  undoRing: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  undoRingIcon: { position: 'absolute' },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
