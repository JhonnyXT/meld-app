import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation, type TranslationKey } from '@/i18n';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';

const DESTINATIONS: { path: string; labelKey: TranslationKey; icon: 'view-day' | 'calendar-month' | 'inbox' | 'photo-library' | 'settings' }[] = [
  { path: '/', labelKey: 'today', icon: 'view-day' },
  { path: '/inbox', labelKey: 'inbox', icon: 'inbox' },
  { path: '/calendar', labelKey: 'calendar', icon: 'calendar-month' },
  { path: '/moments', labelKey: 'moments', icon: 'photo-library' },
  { path: '/settings', labelKey: 'settings', icon: 'settings' },
];

export function NavigateMenu() {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const visible = useNavigateMenuStore((s) => s.visible);
  const close = useNavigateMenuStore((s) => s.close);
  const router = useRouter();
  const pathname = usePathname();

  const go = (path: string) => {
    close();
    router.replace(path as never);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.header}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('navigate')}</Text>
            <Pressable onPress={close} style={[styles.closeButton, { backgroundColor: palette.surfaceLow }]}>
              <Icon name="close" size={18} color={palette.textDim} />
            </Pressable>
          </View>
          <View style={styles.row}>
            {DESTINATIONS.map((dest) => {
              const active = pathname === dest.path;
              return (
                <Pressable key={dest.path} onPress={() => go(dest.path)} style={styles.item}>
                  <View style={[styles.iconBox, active && { backgroundColor: palette.accent }]}>
                    <Icon name={dest.icon} size={20} color={active ? '#fff' : palette.textDim} />
                  </View>
                  <Text
                    style={{
                      fontFamily: font.medium,
                      fontSize: 11,
                      color: active ? palette.accent : palette.textDim,
                      marginTop: 6,
                    }}
                  >
                    {t(dest.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  closeButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { alignItems: 'center', flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
