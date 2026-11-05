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
  arrayUnion,
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

/** Lo mismo que `pullCollection`, para una categoría compartida en vez del respaldo personal
 * (SYNC_ROADMAP.md, Fase 4) — `spaces/{spaceId}/{kind}` en vez de `users/{uid}/{kind}`. */
export async function pullSpaceCollection<T extends object>(
  spaceId: string,
  kind: ItemCollection,
  cursor: number,
): Promise<RemoteDoc<T>[]> {
  return pullPaged<T>(collection(db(), 'spaces', spaceId, COLLECTION_PATH[kind]), cursor);
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
  await pushBatchTo(['users', uid], ops);
}

/** Lo mismo que `pushBatch`, a `spaces/{spaceId}/{kind}` en vez de `users/{uid}/{kind}`
 * (SYNC_ROADMAP.md, Fase 4). Las reglas (`firestore.rules`) exigen ser editor del espacio —
 * si un lector llega a tener algo pendiente (todavía no hay gating de UI que lo impida, ver
 * roadmap), el `commit()` de acá rechaza y la fila queda `pending` para reintentar, igual que
 * cualquier otro error de permisos. */
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

// ─── Espacios compartidos (SYNC_ROADMAP.md, Fase 4) ────────────────────────────

/** Los espacios de los que soy miembro ahora mismo (`memberUids array-contains uid`, ver
 * `firestore.rules`) — incluye los marcados `deletedAt` (así el motor de sync se entera y
 * desconecta la categoría local; `firestore.rules` deja leer un espacio eliminado solo para
 * eso). No usa `serverUpdatedAt`/cursor: a diferencia de `items`/`habitCompletions`/etc., un
 * espacio no tiene muchos documentos que paginar — son pocos (T10: máximo 6 miembros cada uno,
 * y un Free está en pocos como invitado), así que se listan enteros en cada corrida. */
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

/** Mi propia fila en `spaces/{id}/members/{uid}` (ver `firestore.rules` — cada quien solo puede
 * escribir la suya). `uid` es siempre el de la sesión actual: no hay forma de leer/escribir la
 * de otro miembro desde acá (ver el indicador "quién hizo esto", todavía sin UI). */
export async function getSpaceMember(spaceId: string, uid: string): Promise<RemoteDoc<SpaceMemberDoc> | null> {
  const snap = await getDocFromServer(doc(db(), 'spaces', spaceId, 'members', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as SpaceMemberDoc & { serverUpdatedAt: unknown };
  return { id: snap.id, data, serverUpdatedAt: millis(data.serverUpdatedAt) };
}

export async function setSpaceMember(spaceId: string, uid: string, data: SpaceMemberDoc): Promise<void> {
  await setDoc(doc(db(), 'spaces', spaceId, 'members', uid), { ...data, serverUpdatedAt: serverTimestamp() });
}

/** Crea `spaces/{spaceId}` (compartir una categoría, SYNC_ROADMAP.md Fase 4) — `spaceId` es
 * siempre el `id` de la categoría que se comparte (ver el comentario largo en
 * `data/local/schema.ts` → `categories.spaceId`). `setDoc` sobre un id que ya existe lo
 * actualizaría en vez de crearlo; `firestore.rules` no tiene regla de `update` para un espacio
 * recién creado por su dueño salvo las ramas de quitar miembro/cambiar rol/unirse, así que un
 * intento de re-crear un espacio existente simplemente falla por permisos (nunca pisa uno ajeno). */
export async function createSpaceDoc(spaceId: string, data: SpaceDoc): Promise<void> {
  await setDoc(doc(db(), 'spaces', spaceId), { ...data, serverUpdatedAt: serverTimestamp() });
}

/** Borra puntualmente documentos de `users/{uid}/{kind}` por id — usado al compartir una
 * categoría (SYNC_ROADMAP.md, Fase 4): sus ítems/completados/la categoría misma dejan de vivir en
 * el respaldo personal (de ahí en más viven en `spaces/{id}/...`), así que su fila vieja ahí (si
 * ya se había subido) se tombstona de verdad en vez de quedar huérfana. Borrar un id que nunca se
 * subió (o que ya no existe) es inofensivo: `batch.delete()` de un documento ausente no falla. */
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

/** Genera un código de invitación (`inviteCodes/{code}`) — `create` no pisa uno existente
 * (`firestore.rules`: eso sería `update`, que no se permite), así que una colisión al generar el
 * código al azar simplemente falla por permisos y se reintenta con otro. */
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

/** Lo que hace falta de un código para unirse ("Unirme con un código", SYNC_ROADMAP.md Fase 4) —
 * `expiresAtMs` ya convertido de `Timestamp` a epoch ms (mismo criterio que `millis()` en todo
 * este archivo), para comparar con `Date.now()` sin tocar Firestore de nuevo. `null` = el código
 * no existe (ya se usó un vencido y se borró, se tipeó mal, o nunca existió). */
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

/** Me uno a un espacio con un código vigente (rama "unirse" de `allow update` en
 * `firestore.rules`) — `joinCode` viaja en el mismo `update` para que la regla pueda validarlo
 * (`exists(...)`/`spaceId`/`expiresAt`) sin una Cloud Function; queda guardado en el documento
 * (las reglas no lo limpian después, ni falta — es solo un rastro de qué código se usó).
 *
 * `arrayUnion` en vez de leer el espacio primero y mandar el arreglo completo a mano: **no se
 * puede leer `spaces/{id}` antes de unirme** (`allow get` exige ya ser miembro — probado contra
 * las reglas reales con un segundo usuario: un `getDoc` previo revienta con `PERMISSION_DENIED`,
 * encontrado en este mismo paso antes de que llegara a producción). Las reglas sí ven
 * `request.resource.data` ya resuelto (con el `arrayUnion` aplicado), así que
 * `memberUids.size() == resource.data.memberUids.size() + 1` sigue funcionando sin que el
 * cliente conozca el tamaño anterior. Pasar `editorUids` únicamente cuando el código es de
 * editor: la regla exige que SOLO esas claves cambien (`changedOnly`), y para un código de
 * lector ni siquiera se toca ese arreglo. */
export async function joinSpace(spaceId: string, uid: string, data: { joinCode: string; asEditor: boolean }): Promise<void> {
  const update: Record<string, unknown> = {
    memberUids: arrayUnion(uid),
    joinCode: data.joinCode,
    serverUpdatedAt: serverTimestamp(),
  };
  if (data.asEditor) update.editorUids = arrayUnion(uid);
  await updateDoc(doc(db(), 'spaces', spaceId), update);
}
