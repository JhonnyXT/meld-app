import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, Animated, StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

interface ConfirmDialogProps {
  visible: boolean;
  icon?: IconName;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal de confirmación propio del sistema de diseño de Meld — reemplaza el
 * `Alert.alert` nativo del sistema operativo para acciones destructivas. */
export function ConfirmDialog({
  visible,
  icon = 'delete-outline',
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { palette, font } = useTheme();
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border, transform: [{ scale }] },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: `${palette.danger}26` }]}>
            <Icon name={icon} size={26} color={palette.danger} />
          </View>
          <Text style={[styles.title, { fontFamily: font.bold, color: palette.text }]}>{title}</Text>
          <Text style={[styles.message, { fontFamily: font.regular, color: palette.textDim }]}>{message}</Text>
          <View style={styles.buttons}>
            <Pressable onPress={onCancel} style={[styles.btn, { backgroundColor: palette.surfaceLow }]}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.text }}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.btn, { backgroundColor: palette.danger }]}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: '#fff' }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 18, textAlign: 'center', marginBottom: 6, letterSpacing: -0.2 },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  buttons: { flexDirection: 'row', gap: 10, width: '100%' },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
});
