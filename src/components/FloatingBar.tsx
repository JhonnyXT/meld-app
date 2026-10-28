import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useTimeDragStore } from '@/store/timeDragStore';
import { useUndoStore, UNDO_DURATION_MS } from '@/store/undoStore';
import { minutesToLabel, formatDelta } from '@/domain/time';
import {
  FLOATING_BAR_MARGIN,
  FLOATING_BAR_HEIGHT,
  FLOATING_BAR_CONFIRM_ROW_HEIGHT,
  FLOATING_BAR_ROW_GAP,
} from './floatingBarGeometry';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const PANEL_LAYOUT = LinearTransition.duration(240).easing(Easing.out(Easing.cubic));
const PANEL_ENTER = FadeIn.duration(200).delay(60);
const PANEL_EXIT = FadeOut.duration(120);

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
  /** Fila extra opcional que estira la card hacia arriba, mismo patrón que
   * `TimeConfirmRow`/`UndoRow` (con las que es mutuamente excluyente — esas
   * dos tienen prioridad si están activas). Hoy solo la usa `DayBar` para
   * "Volver a hoy" cuando el día mostrado no es el actual. */
  topRow?: React.ReactNode;
  /** Panel que se despliega DENTRO de la barra, por encima de las 3 piezas:
   * con él la barra entera se vuelve una sola card que crece hacia arriba
   * (hoy: el calendario de mes de `DayBar`, pedido explícito del usuario
   * 2026-10-27 con referencia visual — en vez de abrir un modal). Mientras
   * está abierto se ocultan `topRow`/Deshacer/Confirmar hora. */
  expandedPanel?: React.ReactNode;
}

/** Esqueleto compartido de la barra flotante inferior: 3 piezas separadas por un
 * hueco visible — menú (círculo), contenido central (card propia) y FAB
 * (círculo) — pedido explícito del usuario (2026-08-27, referencia visual con
 * las 3 piezas sueltas), reemplaza la versión anterior de una sola card
 * continua con las 3 cosas adentro. Menú y FAB quedan FIJOS (`sideSlot` con
 * altura constante `FLOATING_BAR_HEIGHT`, alineados al fondo del row) — solo
 * la card central crece hacia arriba mientras hay un arrastre de hora activo
 * (`useTimeDragStore`), un Undo visible, o una fila `topRow` (p. ej. "Volver a
 * hoy" de `DayBar`), sin mover ni separar más a menú/FAB de su lugar. */
export function FloatingBar({
  center,
  onMenuPress,
  onAddPress,
  fabSize = 56,
  barRadius = 24,
  centerStyle,
  menuIcon = 'menu',
  fabIcon = 'add',
  fabColor,
  menuLabel,
  fabLabel,
  topRow,
  expandedPanel,
}: FloatingBarProps) {
  const { palette } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dragging = useTimeDragStore((s) => s.active);
  const undoVisible = useUndoStore((s) => s.visible);

  const expanded = expandedPanel != null;

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, FLOATING_BAR_MARGIN) }]} pointerEvents="box-none">
      {!expanded && (dragging || undoVisible || topRow) ? (
        // Card flotante SEPARADA por encima de toda la barra (con hueco), a
        // todo el ancho — no una card pegada al pill ni estirando la barra
        // (pedido explícito 2026-08-29). Fondo/sombra propios porque las 3
        // filas (Confirmar hora / Deshacer / Volver a hoy) no los traen.
        <View
          style={[
            styles.card,
            styles.floatingRowCard,
            { backgroundColor: palette.surface, borderRadius: barRadius },
          ]}
        >
          {dragging ? <TimeConfirmRow /> : undoVisible ? <UndoRow /> : topRow}
        </View>
      ) : null}
      <Animated.View
        layout={PANEL_LAYOUT}
        style={[
          styles.panelShell,
          expanded && [styles.card, styles.panelOpen, { backgroundColor: palette.surface }],
        ]}
      >
      {expanded ? (
        <Animated.View entering={PANEL_ENTER} exiting={PANEL_EXIT} style={styles.panel}>
          {expandedPanel}
        </Animated.View>
      ) : null}
      <View style={styles.row}>
        <View style={styles.sideSlot}>
          <Pressable
            onPress={onMenuPress}
            style={[
              styles.circleBtn,
              { backgroundColor: palette.surface },
              // Dentro de la card abierta el menú queda como ícono plano
              // (sin círculo ni sombra), igual que en la referencia.
              expanded && styles.circleBtnFlat,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={menuLabel ?? t('navigate')}
          >
            <Icon name={menuIcon} size={24} color={palette.text} />
          </Pressable>
        </View>

        <View style={styles.centerColumn}>
          {/* El pill de `center` flota solo — `DayBar`/`Inbox` ya dibujan su
              propio pill con `pillSolid`, el resto de pantallas usa
              `palette.pillSolid` directo en su `.pill`. */}
          <View style={[styles.bar, { paddingHorizontal: 0 }, centerStyle]}>{center}</View>
        </View>

        <View style={styles.sideSlot}>
          <Pressable
            onPress={onAddPress}
            style={[
              styles.circleBtn,
              styles.fab,
              { backgroundColor: fabColor ?? palette.accent, width: fabSize, height: fabSize, borderRadius: fabSize / 2 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={fabLabel ?? t('a11yAddItem')}
          >
            <Icon name={fabIcon} size={fabSize >= 56 ? 28 : 24} color="#fff" />
          </Pressable>
        </View>
      </View>
      </Animated.View>
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
  floatingRowCard: {
    width: '100%',
    maxWidth: 420,
    marginBottom: FLOATING_BAR_ROW_GAP,
  },
  row: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  // Alto fijo = altura de la fila base (`bar`) sin ninguna fila extra encima —
  // menú/FAB se centran ahí y quedan pegados al fondo del `row` (alignItems:
  // 'flex-end'), así nunca se mueven aunque la card central crezca hacia
  // arriba para mostrar Confirmar hora/Deshacer/Volver a hoy.
  sideSlot: { height: FLOATING_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  circleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  circleBtnFlat: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  centerColumn: { flex: 1 },
  panelShell: { width: '100%', maxWidth: 420, alignItems: 'center' },
  // La card abierta envuelve panel + barra: el padding lateral corre la barra
  // hacia adentro, así que menú/pill/FAB quedan dentro del borde redondeado.
  panelOpen: { borderRadius: 32, paddingHorizontal: 10, paddingTop: 18 },
  panel: { width: '100%', paddingHorizontal: 8, paddingBottom: 6 },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  bar: {
    height: FLOATING_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  confirmRow: {
    height: FLOATING_BAR_CONFIRM_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  fab: { borderWidth: 0 },
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
