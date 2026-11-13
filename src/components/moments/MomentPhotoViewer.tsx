import React from 'react';
import { Modal, Pressable, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';

interface MomentPhotoViewerProps {
  uri: string | null;
  onClose: () => void;
}

export function MomentPhotoViewer({ uri, onClose }: MomentPhotoViewerProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={uri !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {uri !== null ? (
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        ) : null}
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          accessibilityRole="button"
        >
          <Icon name="close" size={22} color="#fff" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
