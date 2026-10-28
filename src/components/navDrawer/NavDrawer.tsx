import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation, type TranslationKey } from '@/i18n';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { useInboxStore } from '@/store/inboxStore';
import { useCategoriesSheetStore } from '@/store/categoriesSheetStore';
import { buildMonthGrid } from '@/domain/calendarGrid';
import { formatLongDate, toDateKey } from '@/domain/date';

const DRAWER_MAX_WIDTH = 320;
const DRAWER_WIDTH_RATIO = 0.78;
/** Cuánto se achica la pantalla empujada (1 → 0.92) — da la sensación de que
 * la app "se va hacia atrás" detrás del menú, como en la referencia. */
const CONTENT_SCALE = 0.92;
const CONTENT_RADIUS = 28;
const OPEN_MS = 280;
const easing = Easing.out(Easing.cubic);

const WEEKDAY_INITIALS = { en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], es: ['L', 'M', 'M', 'J', 'V', 'S', 'D'] };

type DrawerEntry =
  | { kind: 'route'; path: string; labelKey: TranslationKey; icon: IconName; badge?: 'inbox' }
  | { kind: 'action'; id: 'categories'; labelKey: TranslationKey; icon: IconName }
  | { kind: 'divider'; id: string };

/** Orden de la referencia: pantallas del día › organizar › ajustes. Hábitos no
 * tiene pantalla propia todavía (viven en Hoy), así que no figura. */
const ENTRIES: DrawerEntry[] = [
  { kind: 'route', path: '/', labelKey: 'today', icon: 'view-day' },
  { kind: 'route', path: '/calendar', labelKey: 'calendar', icon: 'calendar-month' },
  { kind: 'route', path: '/moments', labelKey: 'moments', icon: 'photo-library' },
  { kind: 'divider', id: 'd1' },
  { kind: 'route', path: '/inbox', labelKey: 'inbox', icon: 'inbox', badge: 'inbox' },
  { kind: 'action', id: 'categories', labelKey: 'settingsCategories', icon: 'folder' },
  { kind: 'divider', id: 'd2' },
  { kind: 'route', path: '/settings', labelKey: 'settings', icon: 'settings' },
];

/** Menú lateral de navegación: al abrirlo (botón ☰ de `FloatingBar` →
 * `navigateMenuStore`) la pantalla actual se desliza a la derecha, se achica
 * y redondea sus esquinas, y debajo aparece el menú a la izquierda (mini
 * calendario del mes + destinos). Tocar o arrastrar hacia la izquierda la
 * pantalla empujada lo cierra; el botón "atrás" de Android también. Envuelve
 * al `Stack` raíz — las hojas globales (Quick Add, detalle, etc.) quedan
 * fuera, por encima. */
export function NavDrawerLayout({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const visible = useNavigateMenuStore((s) => s.visible);
  const close = useNavigateMenuStore((s) => s.close);
  const drawerWidth = Math.min(width * DRAWER_WIDTH_RATIO, DRAWER_MAX_WIDTH);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: OPEN_MS, easing });
    if (visible) useInboxStore.getState().reload();
  }, [visible, progress]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [visible, close]);

  // Arrastrar la pantalla empujada hacia la izquierda la devuelve a su lugar.
  // El cálculo va inline en el worklet (ver Gotchas en CLAUDE.md); solo
  // `close` pasa por `runOnJS`.
  const dragClose = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      const next = 1 + e.translationX / drawerWidth;
      progress.value = next < 0 ? 0 : next > 1 ? 1 : next;
    })
    .onEnd((e) => {
      if (e.velocityX < -500 || progress.value < 0.6) {
        progress.value = withTiming(0, { duration: OPEN_MS, easing });
        runOnJS(close)();
      } else {
        progress.value = withTiming(1, { duration: OPEN_MS, easing });
      }
    });

  const tapClose = Gesture.Tap().onEnd(() => {
    runOnJS(close)();
  });

  const contentStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(progress.value, [0, 1], [0, CONTENT_RADIUS]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, drawerWidth]) },
      { scale: interpolate(progress.value, [0, 1], [1, CONTENT_SCALE]) },
    ],
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-24, 0]) }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: palette.surfaceLow }]}>
      <Animated.View
        style={[styles.menu, { width: drawerWidth }, menuStyle]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <NavDrawerMenu />
      </Animated.View>

      <Animated.View style={[styles.content, { backgroundColor: palette.bg }, contentStyle]}>
        {children}
        {visible ? (
          <GestureDetector gesture={Gesture.Exclusive(dragClose, tapClose)}>
            <View style={StyleSheet.absoluteFill} />
          </GestureDetector>
        ) : null}
      </Animated.View>
    </View>
  );
}

function NavDrawerMenu() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const inboxCount = useInboxStore((s) => s.items.length);
  const visible = useNavigateMenuStore((s) => s.visible);

  // Se recalcula cada vez que se abre, por si cambió el día con la app abierta.
  const today = useMemo(() => new Date(), [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayKey = toDateKey(today);
  // Semanas como filas explícitas de 7: con `flexWrap` + anchos en % el
  // redondeo hacía saltar la 7ma celda a la fila siguiente.
  const weeks = useMemo(() => {
    const grid = buildMonthGrid(today.getFullYear(), today.getMonth(), today);
    return Array.from({ length: grid.length / 7 }, (_, w) => grid.slice(w * 7, w * 7 + 7));
  }, [today]);

  const closeMenu = () => useNavigateMenuStore.getState().close();

  const goTo = (path: string) => {
    closeMenu();
    if (pathname !== path) router.replace(path as never);
  };

  const goToDay = (dateKey: string) => {
    closeMenu();
    if (pathname === '/') router.setParams({ date: dateKey });
    else router.replace({ pathname: '/', params: { date: dateKey } });
  };

  const openCategories = () => {
    closeMenu();
    useCategoriesSheetStore.getState().open();
  };

  return (
    <View style={[styles.menuInner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <Text style={{ fontFamily: font.bold, fontSize: 16, color: palette.text, marginBottom: 14, paddingHorizontal: 4 }}>
        {formatLongDate(today, lang)}
      </Text>

      <View style={styles.calRow}>
        {WEEKDAY_INITIALS[lang].map((label, i) => (
          <View key={i} style={styles.calCell}>
            <Text style={{ fontFamily: font.semibold, fontSize: 10, color: palette.textDim }}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.calGrid}>
        {weeks.map((week) => (
          <View key={week[0].dateKey} style={styles.calRow}>
            {week.map((cell) => {
              const isToday = cell.dateKey === todayKey;
              return (
                <Pressable key={cell.dateKey} onPress={() => goToDay(cell.dateKey)} style={styles.calCell} hitSlop={2}>
                  <View style={[styles.calDay, isToday && { backgroundColor: palette.surfaceHigh }]}>
                    <Text
                      style={{
                        fontFamily: isToday ? font.bold : font.semibold,
                        fontSize: 12,
                        color: palette.text,
                        opacity: cell.inCurrentMonth ? 1 : 0.35,
                      }}
                    >
                      {cell.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.list}>
        {ENTRIES.map((entry) => {
          if (entry.kind === 'divider') {
            return <View key={entry.id} style={[styles.divider, { backgroundColor: palette.border }]} />;
          }
          const active = entry.kind === 'route' && pathname === entry.path;
          const count = entry.kind === 'route' && entry.badge === 'inbox' ? inboxCount : 0;
          return (
            <Pressable
              key={entry.kind === 'route' ? entry.path : entry.id}
              onPress={() => (entry.kind === 'route' ? goTo(entry.path) : openCategories())}
              style={({ pressed }) => [
                styles.item,
                (active || pressed) && { backgroundColor: palette.surfaceHigh },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Icon name={entry.icon} size={19} color={active ? palette.accent : palette.textDim} />
              <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: palette.text }}>
                {t(entry.labelKey)}
              </Text>
              {count > 0 ? (
                <Text style={{ fontFamily: font.medium, fontSize: 13, color: palette.textDim }}>{count}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  menu: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  menuInner: { flex: 1, paddingHorizontal: 18 },
  content: {
    flex: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: -6, height: 0 },
    elevation: 16,
  },
  calRow: { flexDirection: 'row' },
  calGrid: { marginTop: 4, marginBottom: 18 },
  calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 1 },
  calDay: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  divider: { height: 1, marginVertical: 8, marginHorizontal: 12 },
});
