import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Share, StyleSheet } from 'react-native';
import { GestureHandlerRootView, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useSheetDragDismiss } from '@/hooks/useSheetDragDismiss';
import { useSettingsStore } from '@/store/settingsStore';
import {
  changeMemberRole,
  createCategoryInviteCode,
  deleteCategorySpace,
  ensureMyMemberRow,
  leaveCategorySpace,
  listCategoryMembers,
  removeMemberFromCategory,
  shareCategory,
  useSession,
  type SpaceMemberInfo,
} from '@/sync';
import type { Category } from '@/domain/category';
import type { SpaceRole } from '@/domain/category';

interface ShareCategorySheetProps {
  visible: boolean;
  category: Category | null;
  onClose: () => void;
}

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

  const [members, setMembers] = useState<SpaceMemberInfo[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<SpaceMemberInfo | null>(null);
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRole('editor');
    setCode(null);
    setError(false);
    setBusy(false);
    setMembers([]);
    setPendingRemove(null);
    setLeaveConfirmVisible(false);
    setDeleteConfirmVisible(false);
  }, [visible, category?.id]);

  const spaceId = category?.space?.spaceId ?? null;
  const isOwnerUid = !!category?.space && category.space.ownerUid === sessionUser?.uid;
  const loadMembers = useCallback(async () => {
    if (!spaceId) return;
    setMembersLoading(true);
    try {
      let list = await listCategoryMembers(spaceId);
      // ver docs/adr/0011-dueno-necesita-su-propia-fila-de-miembro.md
      if (isOwnerUid && !list.some((m) => m.uid === sessionUser?.uid && m.name !== m.uid)) {
        await ensureMyMemberRow(spaceId);
        list = await listCategoryMembers(spaceId);
      }
      setMembers(list);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [spaceId, isOwnerUid, sessionUser?.uid]);

  useEffect(() => {
    if (visible && spaceId) loadMembers();
  }, [visible, spaceId, loadMembers]);

  const { gesture: dragGesture, animatedStyle: dragStyle } = useSheetDragDismiss(visible, onClose);

  if (!category) return null;

  const alreadyShared = !!category.space;
  const isOwner = isOwnerUid;

  const handleRoleChange = async (member: SpaceMemberInfo, nextRole: SpaceRole) => {
    if (!spaceId || nextRole === member.role) return;
    setMembers((prev) => prev.map((m) => (m.uid === member.uid ? { ...m, role: nextRole } : m)));
    try {
      await changeMemberRole(spaceId, member.uid, nextRole);
    } catch {
      loadMembers();
    }
  };

  const confirmRemoveMember = async () => {
    if (!spaceId || !pendingRemove) return;
    const removedUid = pendingRemove.uid;
    setPendingRemove(null);
    setMembers((prev) => prev.filter((m) => m.uid !== removedUid));
    await removeMemberFromCategory(spaceId, removedUid).catch(() => loadMembers());
  };

  const confirmLeave = async () => {
    if (!spaceId) return;
    setLeaveConfirmVisible(false);
    await leaveCategorySpace(spaceId).catch(() => undefined);
    onClose();
  };

  const confirmDeleteSpace = async () => {
    if (!spaceId) return;
    setDeleteConfirmVisible(false);
    await deleteCategorySpace(spaceId).catch(() => undefined);
    onClose();
  };

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
              <View style={[styles.previewCircle, { backgroundColor: category.color }]}>
                <Icon name={category.icon} size={20} color="#fff" />
              </View>
              <View style={styles.headerText}>
                <Text numberOfLines={1} style={{ fontFamily: font.extrabold, fontSize: 19, color: palette.text }}>
                  {category.label}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim }}>
                  {t('shareCategoryTitle')}
                </Text>
              </View>
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
              {!sessionUser ? (
                <EmptyNotice
                  icon="log-out"
                  title={t('shareCategorySignInTitle')}
                  message={t('shareCategorySignInMessage')}
                />
              ) : !alreadyShared && plan !== 'pro' ? (
                // ver docs/adr/0016-gate-de-plan-no-debe-bloquear-invitado.md
                <EmptyNotice
                  icon="sparkles"
                  title={t('shareCategoryProOnlyTitle')}
                  message={t('shareCategoryProOnlyMessage')}
                />
              ) : (
                <>
                  {!alreadyShared ? (
                    <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim, lineHeight: 20, marginBottom: 20 }}>
                      {t('shareCategoryIntro', { label: category.label })}
                    </Text>
                  ) : null}

                  {alreadyShared && !membersLoading && members.length > 0 ? (
                    <View style={styles.section}>
                      <Text style={[styles.sectionLabel, { fontFamily: font.semibold, color: palette.textDim }]}>{t('shareCategoryMembersTitle')}</Text>
                      <View style={[styles.card, { backgroundColor: palette.surfaceLow }]}>
                        {members.map((member, i) => {
                          const isMe = member.uid === sessionUser?.uid;
                          const name = isMe ? t('shareCategoryMemberYou') : member.name;
                          const initial = name.trim().charAt(0).toUpperCase() || '?';
                          return (
                            <View
                              key={member.uid}
                              style={[
                                styles.memberRow,
                                i < members.length - 1 && { borderBottomWidth: 1, borderBottomColor: palette.border },
                              ]}
                            >
                              <View style={[styles.avatar, { backgroundColor: category.color }]}>
                                <Text style={{ fontFamily: font.bold, fontSize: 13, color: '#fff' }}>{initial}</Text>
                              </View>
                              <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 14, color: palette.text, flex: 1 }}>
                                {name}
                              </Text>
                              {member.isOwner ? (
                                <View style={[styles.memberRolePill, { backgroundColor: palette.surfaceHigh }]}>
                                  <Text style={{ fontFamily: font.semibold, fontSize: 12, color: palette.textDim }}>
                                    {t('shareCategoryMemberOwner')}
                                  </Text>
                                </View>
                              ) : isOwner ? (
                                <>
                                  <Pressable
                                    onPress={() => handleRoleChange(member, member.role === 'editor' ? 'viewer' : 'editor')}
                                    style={[styles.memberRolePill, { backgroundColor: palette.surfaceHigh }]}
                                  >
                                    <Text style={{ fontFamily: font.semibold, fontSize: 12, color: palette.text }}>
                                      {member.role === 'editor' ? t('shareCategoryRoleEditorShort') : t('shareCategoryRoleViewerShort')}
                                    </Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => setPendingRemove(member)}
                                    hitSlop={8}
                                    style={styles.memberRemoveBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('a11yRemoveMember')}
                                  >
                                    <Icon name="delete-outline" size={16} color={palette.danger} />
                                  </Pressable>
                                </>
                              ) : (
                                <View style={[styles.memberRolePill, { backgroundColor: palette.surfaceHigh }]}>
                                  <Text style={{ fontFamily: font.semibold, fontSize: 12, color: palette.textDim }}>
                                    {member.role === 'editor' ? t('shareCategoryRoleEditorShort') : t('shareCategoryRoleViewerShort')}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  {!code ? (
                    <View style={styles.section}>
                      <Text style={[styles.sectionLabel, { fontFamily: font.semibold, color: palette.textDim }]}>{t('shareCategoryRoleLabel')}</Text>
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
                        <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.danger, marginTop: 12 }}>
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
                    </View>
                  ) : (
                    <View style={styles.section}>
                      <Text style={[styles.sectionLabel, { fontFamily: font.semibold, color: palette.textDim }]}>{t('shareCategoryCodeLabel')}</Text>
                      <View style={[styles.codeBox, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                        <Text selectable style={{ fontFamily: font.extrabold, fontSize: 32, letterSpacing: 6, color: palette.text }}>
                          {code}
                        </Text>
                        <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim, marginTop: 8 }}>
                          {t('shareCategoryCodeExpires')}
                        </Text>
                      </View>

                      <Pressable onPress={handleShare} style={[styles.cta, { backgroundColor: palette.accent }]}>
                        <Icon name="share" size={20} color="#fff" />
                        <Text style={{ fontFamily: font.bold, fontSize: 17, color: '#fff' }}>
                          {t('shareCategoryShareAction')}
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {alreadyShared ? (
                    <View style={[styles.dangerSection, { borderTopColor: palette.border }]}>
                      {isOwner ? (
                        <Pressable onPress={() => setDeleteConfirmVisible(true)} style={styles.dangerRow}>
                          <Icon name="delete-outline" size={18} color={palette.danger} />
                          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.danger }}>
                            {t('shareCategoryDeleteButton')}
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable onPress={() => setLeaveConfirmVisible(true)} style={styles.dangerRow}>
                          <Icon name="log-out" size={18} color={palette.danger} />
                          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: palette.danger }}>
                            {t('shareCategoryLeaveButton')}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>

      <ConfirmDialog
        visible={!!pendingRemove}
        title={t('shareCategoryRemoveMemberConfirmTitle')}
        message={t('shareCategoryRemoveMemberConfirmMessage', { label: category.label })}
        confirmLabel={t('a11yRemoveMember')}
        cancelLabel={t('cancel')}
        onConfirm={confirmRemoveMember}
        onCancel={() => setPendingRemove(null)}
      />
      <ConfirmDialog
        visible={leaveConfirmVisible}
        title={t('shareCategoryLeaveConfirmTitle')}
        message={t('shareCategoryLeaveConfirmMessage', { label: category.label })}
        confirmLabel={t('shareCategoryLeaveButton')}
        cancelLabel={t('cancel')}
        onConfirm={confirmLeave}
        onCancel={() => setLeaveConfirmVisible(false)}
      />
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title={t('shareCategoryDeleteConfirmTitle')}
        message={t('shareCategoryDeleteConfirmMessage')}
        confirmLabel={t('shareCategoryDeleteButton')}
        cancelLabel={t('cancel')}
        onConfirm={confirmDeleteSpace}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerText: { flex: 1, gap: 1 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  previewCircle: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 13, marginBottom: 10 },
  card: { borderRadius: 16, overflow: 'hidden' },
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
    marginTop: 16,
  },
  notice: { borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 8 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  memberRolePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  memberRemoveBtn: { padding: 4 },
  dangerSection: { borderTopWidth: 1, paddingTop: 4, marginTop: 4 },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
});
