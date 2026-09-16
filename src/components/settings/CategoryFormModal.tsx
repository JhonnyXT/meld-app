import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useSheetDragDismiss } from '@/hooks/useSheetDragDismiss';
import { CATEGORY_COLOR_PALETTE, CATEGORY_ICON_OPTIONS } from '@/domain/quickAdd';
import type { Category } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';

interface CategoryFormModalProps {
  visible: boolean;
  /** `null` = modo creación; un `Category` existente = modo edición (precarga
   * los campos y muestra el botón de eliminar). */
  initial: Category | null;
  onClose: () => void;
  onSave: (input: { label: string; icon: IconName; color: string }) => void;
  onDelete: () => void;
}

/** Hoja de crear/editar una categoría — mismo patrón visual que
 * `QuickAddSheet` (handle, header, `inputBox`/`configBox`, CTA inferior) para
 * quedar consistente con el resto del sistema de diseño. Se monta encima de
 * `CategoriesManagerSheet` (Modal sobre Modal, mismo patrón ya usado en el
 * resto de la app, p. ej. `DatePickerModal` dentro de `QuickAddSheet`). */
export function CategoryFormModal({ visible, initial, onClose, onSave, onDelete }: CategoryFormModalProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<IconName>(CATEGORY_ICON_OPTIONS[0]);
  const [color, setColor] = useState<string>(CATEGORY_COLOR_PALETTE[0]);

  useEffect(() => {
    if (!visible) return;
    setLabel(initial?.label ?? '');
    setIcon(initial?.icon ?? CATEGORY_ICON_OPTIONS[0]);
    setColor(initial?.color ?? CATEGORY_COLOR_PALETTE[0]);
  }, [visible, initial]);

  const saveDisabled = label.trim().length === 0;
  const { gesture: dragGesture, animatedStyle: dragStyle } = useSheetDragDismiss(visible, onClose);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.sheet, { backgroundColor: palette.surface, paddingBottom: insets.bottom + 16 }, dragStyle]}
        >
          <GestureDetector gesture={dragGesture}>
            <View style={styles.handleGrabArea}>
              <View style={[styles.handle, { backgroundColor: palette.surfaceHigh }]} />
            </View>
          </GestureDetector>

          <View style={styles.header}>
            <Text style={{ fontFamily: font.extrabold, fontSize: 22, color: palette.text }}>
              {initial ? t('categoryEditTitle') : t('categoryNewTitle')}
            </Text>
            <Pressable
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: palette.surfaceLow }]}
              accessibilityRole="button"
              accessibilityLabel={t('a11yCloseSheet')}
            >
              <Icon name="close" size={20} color={palette.textDim} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.preview}>
              <View style={[styles.previewCircle, { backgroundColor: color }]}>
                <Icon name={icon} size={24} color="#fff" />
              </View>
            </View>

            <View style={[styles.inputBox, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder={t('categoryNamePlaceholder')}
                placeholderTextColor={palette.textDim}
                autoCorrect={false}
                style={{ fontFamily: font.medium, fontSize: 16, color: palette.text, padding: 0 }}
              />
            </View>

            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: palette.textDim, marginBottom: 10 }}>
              {t('categoryIconLabel')}
            </Text>
            <View style={styles.grid}>
              {CATEGORY_ICON_OPTIONS.map((opt) => {
                const active = opt === icon;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setIcon(opt)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.iconSwatch,
                      { backgroundColor: active ? color : palette.surfaceLow, borderColor: active ? color : palette.border },
                    ]}
                  >
                    <Icon name={opt} size={18} color={active ? '#fff' : palette.textDim} />
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: palette.textDim, marginTop: 20, marginBottom: 10 }}>
              {t('categoryColorLabel')}
            </Text>
            <View style={styles.grid}>
              {CATEGORY_COLOR_PALETTE.map((opt) => {
                const active = opt === color;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setColor(opt)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[styles.colorSwatch, { backgroundColor: opt }, active && { borderColor: palette.text, borderWidth: 2 }]}
                  >
                    {active ? <Icon name="check" size={14} color="#fff" /> : null}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => onSave({ label: label.trim(), icon, color })}
              disabled={saveDisabled}
              style={[styles.cta, { backgroundColor: palette.accent, opacity: saveDisabled ? 0.5 : 1 }]}
            >
              <Icon name="check" size={20} color="#fff" />
              <Text style={{ fontFamily: font.bold, fontSize: 17, color: '#fff' }}>{t('categorySave')}</Text>
            </Pressable>

            {initial ? (
              <Pressable onPress={onDelete} style={styles.deleteRow}>
                <Icon name="delete-outline" size={18} color={palette.danger} />
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.danger }}>
                  {t('categoryDelete')}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    maxHeight: '88%',
  },
  handleGrabArea: { paddingTop: 12, paddingBottom: 16, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  preview: { alignItems: 'center', marginBottom: 20 },
  previewCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  inputBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconSwatch: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 28,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginBottom: 8,
  },
});
