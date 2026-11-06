import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Share, StyleSheet } from 'react-native';
import { GestureHandlerRootView, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useSheetDragDismiss } from '@/hooks/useSheetDragDismiss';
import { useSettingsStore } from '@/store/settingsStore';
import { createCategoryInviteCode, shareCategory, useSession } from '@/sync';
import type { Category } from '@/domain/category';
import type { SpaceRole } from '@/domain/category';

interface ShareCategorySheetProps {
  visible: boolean;
  category: Category | null;
  onClose: () => void;
}

/** Hoja de "Compartir categoría" (SYNC_ROADMAP.md, Fase 4) — mismo patrón visual que
 * `CategoryFormModal` (handle, header, CTA inferior). Cubre: convertir una categoría personal en
 * un espacio compartido (`shareCategory`, solo la primera vez) y generar un código de invitación
 * (`createCategoryInviteCode`, siempre que se abre con una categoría ya compartida donde soy
 * editor). Gatea en dos pasos ANTES de intentar nada: sesión iniciada (T3) y plan Pro (T9 — solo
 * quien comparte necesita Pro, no quien se une). */
export function ShareCategorySheet({ visible, category, onClose }: ShareCategorySheetProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user: sessionUser } = useSession();
  const plan = useSettingsStore((s) => s.plan);

  const [role, setRole] = useState<SpaceRole>('editor');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRole('editor');
    setCode(null);
    setError(false);
    setBusy(false);
  }, [visible, category?.id]);

  const { gesture: dragGesture, animatedStyle: dragStyle } = useSheetDragDismiss(visible, onClose);

  if (!category) return null;

  const canShare = !!sessionUser && plan === 'pro';
  const alreadyShared = !!category.space;

  const handleGenerate = async () => {
    setBusy(true);
    setError(false);
    try {
      if (!category.space) await shareCategory(category.id);
      const newCode = await createCategoryInviteCode(category.id, role);
      setCode(newCode);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const handleShare = () => {
    if (!code) return;
    Share.share({ message: t('shareCategoryShareMessage', { label: category.label, code }) }).catch(() => undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[styles.sheetWrap]}
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
                {t('shareCategoryTitle')}
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

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.preview}>
                <View style={[styles.previewCircle, { backgroundColor: category.color }]}>
                  <Icon name={category.icon} size={24} color="#fff" />
                </View>
                <Text style={{ fontFamily: font.bold, fontSize: 17, color: palette.text, marginTop: 10 }}>
                  {category.label}
                </Text>
              </View>

              {!sessionUser ? (
                <EmptyNotice
                  icon="log-out"
                  title={t('shareCategorySignInTitle')}
                  message={t('shareCategorySignInMessage')}
                />
              ) : plan !== 'pro' ? (
                <EmptyNotice
                  icon="sparkles"
                  title={t('shareCategoryProOnlyTitle')}
                  message={t('shareCategoryProOnlyMessage')}
                />
              ) : (
                <>
                  <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim, lineHeight: 20, marginBottom: 20 }}>
                    {t('shareCategoryIntro', { label: category.label })}
                  </Text>

                  {alreadyShared ? (
                    <View style={[styles.badge, { backgroundColor: `${palette.accent}1A` }]}>
                      <Icon name="users" size={16} color={palette.accent} />
                      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: palette.accent }}>
                        {t('shareCategoryAlreadyShared')}
                      </Text>
                    </View>
                  ) : null}

                  {!code ? (
                    <>
                      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: palette.textDim, marginBottom: 10 }}>
                        {t('shareCategoryRoleLabel')}
                      </Text>
                      <View style={styles.roleRow}>
                        {(['editor', 'viewer'] as const).map((opt) => {
                          const active = opt === role;
                          return (
                            <Pressable
                              key={opt}
                              onPress={() => setRole(opt)}
                              style={[
                                styles.roleChip,
                                {
                                  backgroundColor: active ? palette.accent : palette.surfaceLow,
                                  borderColor: active ? palette.accent : palette.border,
                                },
                              ]}
                            >
                              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: active ? '#fff' : palette.text, textAlign: 'center' }}>
                                {opt === 'editor' ? t('shareCategoryRoleEditor') : t('shareCategoryRoleViewer')}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {error ? (
                        <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.danger, marginTop: 14 }}>
                          {t('shareCategoryError')}
                        </Text>
                      ) : null}

                      <Pressable
                        onPress={handleGenerate}
                        disabled={busy}
                        style={[styles.cta, { backgroundColor: palette.accent, opacity: busy ? 0.6 : 1 }]}
                      >
                        <Icon name="share" size={20} color="#fff" />
                        <Text style={{ fontFamily: font.bold, fontSize: 17, color: '#fff' }}>
                          {alreadyShared ? t('shareCategoryGenerateAgain') : t('shareCategoryGenerate')}
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: palette.textDim, marginBottom: 8 }}>
                        {t('shareCategoryCodeLabel')}
                      </Text>
                      <View style={[styles.codeBox, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                        <Text selectable style={{ fontFamily: font.extrabold, fontSize: 32, letterSpacing: 6, color: palette.text }}>
                          {code}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim, marginTop: 8, marginBottom: 20 }}>
                        {t('shareCategoryCodeExpires')}
                      </Text>

                      <Pressable onPress={handleShare} style={[styles.cta, { backgroundColor: palette.accent }]}>
                        <Icon name="share" size={20} color="#fff" />
                        <Text style={{ fontFamily: font.bold, fontSize: 17, color: '#fff' }}>
                          {t('shareCategoryShareAction')}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function EmptyNotice({ icon, title, message }: { icon: React.ComponentProps<typeof Icon>['name']; title: string; message: string }) {
  const { palette, font } = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
      <Icon name={icon} size={22} color={palette.textDim} />
      <Text style={{ fontFamily: font.bold, fontSize: 15, color: palette.text, marginTop: 10, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
        {message}
      </Text>
    </View>
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 16,
  },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleChip: { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  codeBox: { borderRadius: 18, borderWidth: 1, paddingVertical: 22, alignItems: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 28,
  },
  notice: { borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 8 },
});
