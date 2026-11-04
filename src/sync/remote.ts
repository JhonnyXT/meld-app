/**
 * Acceso a Firestore de la sync (SYNC_ROADMAP.md, "Modelo en Firestore"). Todo bajo `users/{uid}`;
 * las reglas impiden leer o escribir lo de otro usuario.
 *
 * Traer usa `getDocsFromServer`: sin conexión falla (no lee la caché local, que incluye nuestras
 * propias escrituras pendientes y adelantaría el cursor por error). El orden de traída es
 * `serverUpdatedAt` (hora del servidor), no `updatedAt` (reloj del teléfono, que puede ir
 * atrasado).
 */
import {
  collection,
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
  where,
  writeBatch,
  type CollectionReference,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from '@react-native-firebase/firestore';
import { ensureFirebase } from './firebase';
import { COLLECTION_PATH, type AppSettingsDoc, type ItemCollection, type RemoteDoc, type VersionedDoc } from './mappers';

const PAGE_SIZE = 300;
/** Firestore admite 500 operaciones por lote; se deja margen. */
export const BATCH_SIZE = 400;

export function db() {
  ensureFirebase();
  return getFirestore();
}

export function millis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

/**
 * Documentos de una colección con `serverUpdatedAt >= cursor` (>=: dos escrituras en el mismo ms
 * no se pierden; reaplicar lo mismo es inofensivo porque `pickWinner` empata a favor de lo local).
 */
export async function pullCollection<T extends object>(
  uid: string,
  kind: ItemCollection,
  cursor: number,
): Promise<RemoteDoc<T>[]> {
  return pullPaged<T>(collection(db(), 'users', uid, COLLECTION_PATH[kind]), cursor);
}

/** Traída por páginas, en orden de `serverUpdatedAt`, de cualquier colección. */
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

/**
 * Sube en lotes (cada uno atómico). Cada documento lleva `serverUpdatedAt` del servidor. Sin
 * conexión, `commit()` queda esperando: quien llama pone un tope de tiempo y reintenta después
 * (mismo id y contenido: no duplica).
 */
export async function pushBatch(uid: string, ops: PushOp[]): Promise<void> {
  const firestore = db();
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestore);
    for (const op of ops.slice(i, i + BATCH_SIZE)) {
      const path = doc(firestore, 'users', uid, COLLECTION_PATH[op.kind], op.id);
      batch.set(path, { ...op.data, serverUpdatedAt: serverTimestamp() });
    }
    await batch.commit();
  }
}

/**
 * Borra todo lo de `users/{uid}` (eliminar cuenta). Sin Cloud Functions, el cliente recorre cada
 * colección y borra por lotes. Idempotente: si se corta, se puede repetir.
 */
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

// ─── Ajustes visuales — un solo documento, sin paginar (ver `mappers.ts`) ──────────

export async function getUserSettingsDoc(uid: string): Promise<RemoteDoc<AppSettingsDoc> | null> {
  const snap = await getDocFromServer(doc(db(), 'users', uid, 'settings', 'app'));
  if (!snap.exists()) return null;
  const data = snap.data() as AppSettingsDoc & { serverUpdatedAt: unknown };
  return { id: snap.id, data, serverUpdatedAt: millis(data.serverUpdatedAt) };
}

export async function setUserSettingsDoc(uid: string, data: AppSettingsDoc): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'settings', 'app'), { ...data, serverUpdatedAt: serverTimestamp() });
}
