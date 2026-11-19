import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FloatingBar } from '@/components/FloatingBar';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useCategoriesStore } from '@/store/categoriesStore';
import { useNavigateMenuStore } from '@/store/navigateMenuStore';
import { CategoryFormModal } from '@/components/settings/CategoryFormModal';
import { CategoryItemsModal } from '@/components/settings/CategoryItemsModal';
import { ShareCategorySheet } from '@/components/settings/ShareCategorySheet';
import { JoinCategorySheet } from '@/components/settings/JoinCategorySheet';
import type { Category } from '@/domain/category';
import type { IconName } from '@/domain/iconNames';

export function CategoriesScreen() {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const categories = useCategoriesStore((s) => s.categories);
  const usage = useCategoriesStore((s) => s.usage);
  const load = useCategoriesStore((s) => s.load);
  const addCategory = useCategoriesStore((s) => s.add);
  const updateCategory = useCategoriesStore((s) => s.update);
  const removeCategory = useCategoriesStore((s) => s.remove);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [sharing, setSharing] = useState<Category | null>(null);
  const [joinVisible, setJoinVisible] = useState(false);
  const [viewingItemsOf, setViewingItemsOf] = useState<Category | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!sharing) return;
    const updated = categories.find((c) => c.id === sharing.id);
    if (updated && updated !== sharing) setSharing(updated);
  }, [categories, sharing]);

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
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScreenHeader
        style={{ paddingHorizontal: 16 }}
        title={
          <Text style={{ fontFamily: font.extrabold, fontSize: 34, lineHeight: 46, letterSpacing: -1, color: palette.text }}>
            {t('categoriesScreenTitle')}
          </Text>
        }
        subtitle={
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: palette.textDim }}>
            {t('categoriesScreenSubtitle')}
          </Text>
        }
        right={
          <Pressable
            onPress={() => setJoinVisible(true)}
            style={[styles.roundButton, { backgroundColor: palette.surfaceLow }]}
            accessibilityRole="button"
            accessibilityLabel={t('a11yJoinCategory')}
          >
            <Icon name="link" size={18} color={palette.textDim} />
          </Pressable>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon="folder"
          title={t('categoriesEmptyTitle')}
          message={t('categoriesEmptyMessage')}
          ctaLabel={t('a11yAddCategory')}
          onPressCta={openCreate}
        />
      ) : (
        <ScrollView
          style={{ flex: 1, marginTop: 24 }}
          contentContainerStyle={[styles.list, { paddingHorizontal: 16 }]}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((cat) => {
            const catUsage = usage[cat.label];
            const statusLabel = !catUsage || catUsage.total === 0
              ? null
              : catUsage.pending === 0
                ? t('categoryAllDone')
                : t('categoryPendingCount', { count: catUsage.pending });
            const canShare = !cat.space || cat.space.role === 'editor';
            return (
              <Pressable
                key={cat.id}
                onPress={() => openEdit(cat)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: palette.surfaceLow, borderColor: palette.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.rowIcon, { backgroundColor: cat.color }]}>
                  <Icon name={cat.icon} size={20} color="#fff" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={{ fontFamily: font.bold, fontSize: 16, color: palette.text }} numberOfLines={1}>
                    {cat.label}
                  </Text>
                  {cat.space ? (
                    <View style={[styles.sharedBadge, { backgroundColor: `${palette.accent}1A` }]}>
                      <Icon name="users" size={12} color={palette.accent} />
                      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: palette.accent }}>
                        {cat.space.role === 'editor' ? t('categorySharedEditor') : t('categorySharedViewer')}
                      </Text>
                    </View>
                  ) : statusLabel ? (
                    <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim, marginTop: 2 }}>
                      {statusLabel}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.cardActions}>
                  {canShare ? (
                    <Pressable
                      onPress={() => setSharing(cat)}
                      hitSlop={8}
                      style={[styles.actionButton, { backgroundColor: palette.surfaceHigh }]}
                      accessibilityRole="button"
                      accessibilityLabel={t('a11yShareCategory')}
                    >
                      <Icon name={cat.space ? 'users' : 'share'} size={16} color={cat.space ? palette.accent : palette.textDim} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => setViewingItemsOf(cat)}
                    hitSlop={8}
                    style={[styles.actionButton, { backgroundColor: palette.surfaceHigh }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('a11yViewCategoryItems')}
                  >
                    <Icon name="chevron-right" size={18} color={palette.textDim} />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <FloatingBar
        onMenuPress={() => useNavigateMenuStore.getState().open()}
        onAddPress={openCreate}
        center={
          <View style={[styles.pill, { backgroundColor: palette.pillSolid }]}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text }}>{t('categoriesScreenTitle')}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: palette.textDim }}>
              {t('categoriesCount', { count: categories.length })}
            </Text>
          </View>
        }
      />

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

      <ShareCategorySheet visible={!!sharing} category={sharing} onClose={() => setSharing(null)} />

      <JoinCategorySheet visible={joinVisible} onClose={() => setJoinVisible(false)} />

      <CategoryItemsModal
        visible={!!viewingItemsOf}
        category={viewingItemsOf}
        onClose={() => setViewingItemsOf(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  roundButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 160, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  rowIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 2 },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pill: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
