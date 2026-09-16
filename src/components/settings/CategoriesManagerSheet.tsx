import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useCategoriesSheetStore } from '@/store/categoriesSheetStore';
import { useCategoriesStore } from '@/store/categoriesStore';
import { CategoryFormModal } from './CategoryFormModal';
import type { Category } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';

/** Pantalla dedicada (Modal a pantalla completa, `slide` desde abajo) de
 * Ajustes > Categorías — pedido explícito del usuario (2026-09-11, ver
 * Image #6 de referencia): gestión completa (crear/renombrar/recolorear/
 * reasignar ícono/eliminar) con conteo de ítems por categoría, sin
 * drill-down a la lista de ítems de cada una (eso ya se puede hacer
 * filtrando en Calendario). */
export function CategoriesManagerSheet() {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const visible = useCategoriesSheetStore((s) => s.visible);
  const close = useCategoriesSheetStore((s) => s.close);
  const categories = useCategoriesStore((s) => s.categories);
  const usage = useCategoriesStore((s) => s.usage);
  const load = useCategoriesStore((s) => s.load);
  const addCategory = useCategoriesStore((s) => s.add);
  const updateCategory = useCategoriesStore((s) => s.update);
  const removeCategory = useCategoriesStore((s) => s.remove);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const openCreate = () => {
    setEditing(null);
    setFormVisible(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setFormVisible(true);
  };

  const handleSave = async (input: { label: string; icon: IconName; color: string }) => {
    if (editing) {
      await updateCategory(editing.id, input);
    } else {
      await addCategory(input);
    }
    setFormVisible(false);
  };

  const handleDeleteRequest = () => {
    if (!editing) return;
    setFormVisible(false);
    setPendingDelete(editing);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await removeCategory(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={[styles.screen, { backgroundColor: palette.bg, paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -1, color: palette.text }}>
              {t('categoriesScreenTitle')}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim, marginTop: 4 }}>
              {t('categoriesScreenSubtitle')}
            </Text>
          </View>
          <Pressable
            onPress={openCreate}
            style={[styles.roundButton, { backgroundColor: palette.accent }]}
            accessibilityRole="button"
            accessibilityLabel={t('a11yAddCategory')}
          >
            <Icon name="add" size={20} color="#fff" />
          </Pressable>
          <Pressable
            onPress={close}
            style={[styles.roundButton, { backgroundColor: palette.surfaceLow }]}
            accessibilityRole="button"
            accessibilityLabel={t('a11yCloseSheet')}
          >
            <Icon name="close" size={20} color={palette.textDim} />
          </Pressable>
        </View>

        {categories.length === 0 ? (
          <EmptyState
            icon="folder"
            title={t('categoriesEmptyTitle')}
            message={t('categoriesEmptyMessage')}
            ctaLabel={t('a11yAddCategory')}
            onPressCta={openCreate}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {categories.map((cat) => {
              const catUsage = usage[cat.label];
              const trailing = !catUsage || catUsage.total === 0
                ? null
                : catUsage.pending === 0
                  ? t('categoryAllDone')
                  : String(catUsage.pending);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => openEdit(cat)}
                  style={[styles.row, { borderBottomColor: palette.border }]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: cat.color }]}>
                    <Icon name={cat.icon} size={18} color="#fff" />
                  </View>
                  <Text style={{ fontFamily: font.medium, fontSize: 16, color: palette.text, flex: 1 }} numberOfLines={1}>
                    {cat.label}
                  </Text>
                  {trailing ? (
                    <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim, marginRight: 6 }}>
                      {trailing}
                    </Text>
                  ) : null}
                  <Icon name="chevron-right" size={18} color={palette.textDim} />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <CategoryFormModal
        visible={formVisible}
        initial={editing}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
        onDelete={handleDeleteRequest}
      />

      <ConfirmDialog
        visible={!!pendingDelete}
        title={t('categoryDeleteConfirmTitle')}
        message={t('categoryDeleteConfirmMessage')}
        confirmLabel={t('categoryDelete')}
        cancelLabel={t('cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 20, paddingBottom: 16 },
  roundButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
