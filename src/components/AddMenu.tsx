import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon, type IconName } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useAddMenuStore } from '@/store/addMenuStore';
import { useQuickAddStore } from '@/store/quickAddStore';
import { useVoiceAddStore } from '@/store/voiceAddStore';
import { FLOATING_BAR_MARGIN, FLOATING_BAR_HEIGHT } from '@/components/floatingBarGeometry';

/** El FAB real mide 56; la "×" de acá se dibuja un poco más grande y con más
 * elevación para tapar por completo el `+` real que queda detrás del backdrop
 * (incluida su sombra de Android, que si no asoma como un medialuna coral). */
const REAL_FAB_SIZE = 56;
const FAB_SIZE = 60;
/** El FAB real vive centrado en un `sideSlot` de alto `FLOATING_BAR_HEIGHT`;
 * su borde inferior queda a este offset por encima del `bottom` de la barra.
 * La "×" se alinea a ese mismo borde inferior (de ahí el `- FAB_SIZE`, no
 * `- REAL_FAB_SIZE`, para compensar los 2px extra de alto). */
const FAB_BOTTOM_OFFSET = (FLOATING_BAR_HEIGHT - REAL_FAB_SIZE) / 2 - (FAB_SIZE - REAL_FAB_SIZE) / 2;

/** Speed-dial que se despliega al tocar el FAB "+": el botón se transforma en
 * "×" y sobre él aparecen, escalonadas, las dos formas de agregar un ítem —
 * "Por voz" (pantalla de dictado → parsea → Quick Add pre-llenado) y "Por
 * texto" (Quick Add vacío de siempre). Anclado abajo a la derecha, sobre la
 * posición real del FAB. Montado una sola vez en `app/_layout.tsx`. */
export function AddMenu() {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const visible = useAddMenuStore((s) => s.visible);
  const close = useAddMenuStore((s) => s.close);

  const pick = (fn: () => void) => {
    Haptics.selectionAsync().catch(() => {});
    close();
    fn();
  };

  const options: { key: string; label: string; icon: IconName; color: string; onPress: () => void }[] = [
    {
      key: 'voice',
      label: t('addMenuVoice'),
      icon: 'mic',
      color: palette.accent,
      onPress: () => useVoiceAddStore.getState().open(),
    },
    {
      key: 'text',
      label: t('addMenuText'),
      icon: 'description',
      color: '#4F84FF',
      onPress: () => useQuickAddStore.getState().open('task'),
    },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />

      <View
        style={[styles.wrap, { bottom: Math.max(insets.bottom, FLOATING_BAR_MARGIN) + FAB_BOTTOM_OFFSET }]}
        pointerEvents="box-none"
      >
       <View style={styles.column}>
        <View style={styles.options}>
          {options.map((opt, i) => (
            <Animated.View
              key={opt.key}
              // El más cercano al FAB entra primero.
              entering={FadeInDown.duration(180).delay((options.length - 1 - i) * 50)}
              style={styles.optionRow}
            >
              <Pressable
                onPress={() => pick(opt.onPress)}
                style={[styles.labelPill, { backgroundColor: palette.surface }]}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
              >
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: palette.text }}>{opt.label}</Text>
              </Pressable>
              <Pressable onPress={() => pick(opt.onPress)} style={[styles.optionIcon, { backgroundColor: opt.color }]}>
                <Icon name={opt.icon} size={20} color="#fff" />
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeIn.duration(120)}>
          <Pressable
            onPress={close}
            style={[styles.fab, { backgroundColor: palette.accent }]}
            accessibilityRole="button"
            accessibilityLabel={t('a11yCloseSheet')}
          >
            <Icon name="close" size={26} color="#fff" />
          </Pressable>
        </Animated.View>
       </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  // Mismo encuadre que `FloatingBar` (left/right 16, contenido centrado con
  // tope 420) para que la "×" caiga exactamente sobre el FAB real.
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 420, alignItems: 'flex-end', gap: 14 },
  options: { alignItems: 'flex-end', gap: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labelPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 24,
  },
});
