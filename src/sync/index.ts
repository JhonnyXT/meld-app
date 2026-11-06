// API pública de la capa de sync. Pantallas y hooks importan de acá, nunca de Firebase directo
// (Regla #3 de SYNC_ROADMAP.md, vigilada por sync.boundary.test.ts).
export { signInWithGoogle, signOut, type SessionUser } from './session';
export { useSession } from './useSession';
export { AuthError, authErrorMessage, classifyAuthError, type AuthErrorKind } from './errors';
export {
  changeMemberRole,
  createCategoryInviteCode,
  deleteAccountAndCloudData,
  deleteCategorySpace,
  ensureMyMemberRow,
  JoinCodeError,
  joinCategoryWithCode,
  type JoinCodeErrorKind,
  leaveCategorySpace,
  listCategoryMembers,
  pendingChanges,
  removeMemberFromCategory,
  requestSync,
  shareCategory,
  signOutAndWipeLocalData,
  signOutKeepingLocalData,
  type SpaceMemberInfo,
  startSync,
  syncNow,
} from './engine';
export { useSyncStatus, type SyncPhase } from './status';
