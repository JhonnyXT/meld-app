import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type CollectionReference,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from '@react-native-firebase/firestore';
import { ensureFirebase } from './firebase';
import {
  COLLECTION_PATH,
  type AppSettingsDoc,
  type ItemCollection,
  type RemoteDoc,
  type SpaceCategoryDoc,
  type SpaceDoc,
  type SpaceMemberDoc,
  type VersionedDoc,
} from './mappers';

const PAGE_SIZE = 300;
export const BATCH_SIZE = 400;

export function db() {
  ensureFirebase();
  return getFirestore();
}

export function millis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

export async function pullCollection<T extends object>(
  uid: string,
  kind: ItemCollection,
  cursor: number,
): Promise<RemoteDoc<T>[]> {
  return pullPaged<T>(collection(db(), 'users', uid, COLLECTION_PATH[kind]), cursor);
}

export async function pullSpaceCollection<T extends object>(
  spaceId: string,
  kind: ItemCollection,
  cursor: number,
): Promise<RemoteDoc<T>[]> {
  return pullPaged<T>(collection(db(), 'spaces', spaceId, COLLECTION_PATH[kind]), cursor);
}

export async function pullPaged<T extends object>(
  ref: CollectionReference<DocumentData>,
  cursor: number,
): Promise<RemoteDoc<T>[]> {
  const out: RemoteDoc<T>[] = [];
  let last: QueryDocumentSnapshot<DocumentData> | null = null;
  for (;;) {
    const since = where('serverUpdatedAt', '>=', Timestamp.fromMillis(cursor));
    const q = last
      ? query(ref, since, orderBy('serverUpdatedAt'), startAfter(last), limit(PAGE_SIZE))
      : query(ref, since, orderBy('serverUpdatedAt'), limit(PAGE_SIZE));
    const snap: QuerySnapshot<DocumentData> = await getDocsFromServer(q);
    for (const d of snap.docs) {
      const data = d.data();
      out.push({ id: d.id, data: data as T & VersionedDoc, serverUpdatedAt: millis(data.serverUpdatedAt) });
    }
    if (snap.docs.length < PAGE_SIZE) return out;
    last = snap.docs[snap.docs.length - 1];
  }
}

export interface PushOp {
  kind: ItemCollection;
  id: string;
  data: object;
}

export async function pushBatch(uid: string, ops: PushOp[]): Promise<void> {
  await pushBatchTo(['users', uid], ops);
}

export async function pushSpaceBatch(spaceId: string, ops: PushOp[]): Promise<void> {
  await pushBatchTo(['spaces', spaceId], ops);
}

async function pushBatchTo(basePath: [string, string], ops: PushOp[]): Promise<void> {
  const firestore = db();
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestore);
    for (const op of ops.slice(i, i + BATCH_SIZE)) {
      const path = doc(firestore, ...basePath, COLLECTION_PATH[op.kind], op.id);
      batch.set(path, { ...op.data, serverUpdatedAt: serverTimestamp() });
    }
    await batch.commit();
  }
}

export async function deleteAllUserData(uid: string): Promise<void> {
  const firestore = db();
  for (const path of Object.values(COLLECTION_PATH)) {
    for (;;) {
      const snap = await getDocsFromServer(query(collection(firestore, 'users', uid, path), limit(BATCH_SIZE)));
      if (snap.empty) break;
      const batch = writeBatch(firestore);
      for (const d of snap.docs) batch.delete(d.ref);
      await batch.commit();
    }
  }
  await writeBatch(firestore).delete(doc(firestore, 'users', uid, 'settings', 'app')).commit();
}

export async function getUserSettingsDoc(uid: string): Promise<RemoteDoc<AppSettingsDoc> | null> {
  const snap = await getDocFromServer(doc(db(), 'users', uid, 'settings', 'app'));
  if (!snap.exists()) return null;
  const data = snap.data() as AppSettingsDoc & { serverUpdatedAt: unknown };
  return { id: snap.id, data, serverUpdatedAt: millis(data.serverUpdatedAt) };
}

export async function setUserSettingsDoc(uid: string, data: AppSettingsDoc): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'settings', 'app'), { ...data, serverUpdatedAt: serverTimestamp() });
}

export async function discoverSpaces(uid: string): Promise<RemoteDoc<SpaceDoc>[]> {
  const q = query(collection(db(), 'spaces'), where('memberUids', 'array-contains', uid));
  const snap = await getDocsFromServer(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, data: data as SpaceDoc & VersionedDoc, serverUpdatedAt: millis(data.serverUpdatedAt) };
  });
}

export async function getSpaceConfig(spaceId: string): Promise<RemoteDoc<SpaceCategoryDoc> | null> {
  const snap = await getDocFromServer(doc(db(), 'spaces', spaceId, 'config', 'category'));
  if (!snap.exists()) return null;
  const data = snap.data() as SpaceCategoryDoc & { serverUpdatedAt: unknown };
  return { id: snap.id, data, serverUpdatedAt: millis(data.serverUpdatedAt) };
}

export async function setSpaceConfig(spaceId: string, data: SpaceCategoryDoc): Promise<void> {
  await setDoc(doc(db(), 'spaces', spaceId, 'config', 'category'), { ...data, serverUpdatedAt: serverTimestamp() });
}

export async function getSpaceMember(spaceId: string, uid: string): Promise<RemoteDoc<SpaceMemberDoc> | null> {
  const snap = await getDocFromServer(doc(db(), 'spaces', spaceId, 'members', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as SpaceMemberDoc & { serverUpdatedAt: unknown };
  return { id: snap.id, data, serverUpdatedAt: millis(data.serverUpdatedAt) };
}

export async function setSpaceMember(spaceId: string, uid: string, data: SpaceMemberDoc): Promise<void> {
  await setDoc(doc(db(), 'spaces', spaceId, 'members', uid), { ...data, serverUpdatedAt: serverTimestamp() });
}

export async function createSpaceDoc(spaceId: string, data: SpaceDoc): Promise<void> {
  await setDoc(doc(db(), 'spaces', spaceId), { ...data, serverUpdatedAt: serverTimestamp() });
}

/** Revive un espacio PROPIO ya eliminado — ver docs/adr/0003-revivir-espacio-eliminado.md. */
export async function reviveSpaceDoc(spaceId: string, uid: string): Promise<void> {
  await updateDoc(doc(db(), 'spaces', spaceId), { memberUids: [uid], deletedAt: null, serverUpdatedAt: serverTimestamp() });
  await updateDoc(doc(db(), 'spaces', spaceId), { editorUids: [uid], serverUpdatedAt: serverTimestamp() });
}

export async function deletePersonalDocs(uid: string, kind: ItemCollection, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const firestore = db();
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestore);
    for (const id of ids.slice(i, i + BATCH_SIZE)) {
      batch.delete(doc(firestore, 'users', uid, COLLECTION_PATH[kind], id));
    }
    await batch.commit();
  }
}

export async function createInviteCode(
  code: string,
  data: { spaceId: string; createdBy: string; role: 'editor' | 'viewer'; expiresAtMs: number },
): Promise<void> {
  await setDoc(doc(db(), 'inviteCodes', code), {
    spaceId: data.spaceId,
    createdBy: data.createdBy,
    role: data.role,
    expiresAt: Timestamp.fromMillis(data.expiresAtMs),
  });
}

export interface ResolvedInviteCode {
  spaceId: string;
  createdBy: string;
  role: 'editor' | 'viewer';
  expiresAtMs: number;
}

export async function getInviteCode(code: string): Promise<ResolvedInviteCode | null> {
  const snap = await getDocFromServer(doc(db(), 'inviteCodes', code));
  if (!snap.exists()) return null;
  const data = snap.data() as { spaceId: string; createdBy: string; role?: 'editor' | 'viewer'; expiresAt: unknown };
  return { spaceId: data.spaceId, createdBy: data.createdBy, role: data.role ?? 'editor', expiresAtMs: millis(data.expiresAt) };
}

/** Me uno a un espacio con un código vigente — ver docs/adr/0004-unirse-sin-leer-antes.md. */
export async function joinSpace(spaceId: string, uid: string, data: { joinCode: string; asEditor: boolean }): Promise<void> {
  const update: Record<string, unknown> = {
    memberUids: arrayUnion(uid),
    joinCode: data.joinCode,
    serverUpdatedAt: serverTimestamp(),
  };
  if (data.asEditor) update.editorUids = arrayUnion(uid);
  await updateDoc(doc(db(), 'spaces', spaceId), update);
}

export async function getSpaceDoc(spaceId: string): Promise<SpaceDoc | null> {
  const snap = await getDocFromServer(doc(db(), 'spaces', spaceId));
  if (!snap.exists()) return null;
  return snap.data() as SpaceDoc;
}

export async function listSpaceMembers(spaceId: string): Promise<RemoteDoc<SpaceMemberDoc>[]> {
  const snap = await getDocsFromServer(collection(db(), 'spaces', spaceId, 'members'));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, data: data as SpaceMemberDoc & VersionedDoc, serverUpdatedAt: millis(data.serverUpdatedAt) };
  });
}

export async function setSpaceEditorUids(spaceId: string, editorUids: string[]): Promise<void> {
  await updateDoc(doc(db(), 'spaces', spaceId), { editorUids, serverUpdatedAt: serverTimestamp() });
}

// ver docs/adr/0010-orden-de-leave-space.md
export async function leaveSpace(spaceId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db(), 'spaces', spaceId, 'members', uid)).catch(() => undefined);
  await updateDoc(doc(db(), 'spaces', spaceId), { memberUids: arrayRemove(uid), serverUpdatedAt: serverTimestamp() });
}

export async function removeSpaceMember(spaceId: string, memberUid: string): Promise<void> {
  await deleteDoc(doc(db(), 'spaces', spaceId, 'members', memberUid)).catch(() => undefined);
  await updateDoc(doc(db(), 'spaces', spaceId), { memberUids: arrayRemove(memberUid), serverUpdatedAt: serverTimestamp() });
}

export async function deleteSpace(spaceId: string): Promise<void> {
  await updateDoc(doc(db(), 'spaces', spaceId), { deletedAt: new Date().toISOString(), serverUpdatedAt: serverTimestamp() });
}
