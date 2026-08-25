import React, { useEffect, useRef } from 'react';
import { View, Modal, Pressable, Animated, StyleSheet } from 'react-native';
import { WheelTimePicker } from './WheelTimePicker';

interface TimePickerModalProps {
  visible: boolean;
  valueMinutes: number;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
  onSelectAnyTime?: () => void;
}

export function TimePickerModal({ visible, valueMinutes, onCancel, onConfirm, onSelectAnyTime }: TimePickerModalProps) {
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
        <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
          <WheelTimePicker
            valueMinutes={valueMinutes}
            onCancel={onCancel}
            onConfirm={onConfirm}
            onSelectAnyTime={onSelectAnyTime}
          />
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
  wrap: { width: '100%', maxWidth: 340 },
});
