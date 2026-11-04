/**
 * Reglas de Firestore (firestore.rules) contra el emulador. No corren en `npm test`: necesitan el
 * emulador. Correr con `npm run test:rules` (scripts/test-rules.sh lo levanta y lo apaga).
 *
 * Fase 3 (SYNC_ROADMAP.md): cada usuario solo lee/escribe lo suyo, bajo users/{uid}. spaces/{id}
 * llega en la Fase 4 (diseño de referencia en my-wallet-app/firestore.rules) — todo lo demás sigue
 * negado.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-meld',
    firestore: { rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});

afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const ITEM = { title: 'Llamar al dentista', updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null };

describe('users/{uid}', () => {
  it('el dueño lee y escribe sus documentos, también en subcolecciones', async () => {
    const db = env.authenticatedContext('ana').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/ana/items/i1'), ITEM));
    await assertSucceeds(getDoc(doc(db, 'users/ana/items/i1')));
    await assertSucceeds(setDoc(doc(db, 'users/ana/categories/c1'), { label: 'Casa' }));
    await assertSucceeds(deleteDoc(doc(db, 'users/ana/items/i1')));
  });

  it('otro usuario autenticado no puede leer ni escribir', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/ana/items/i1'), ITEM);
    });
    const db = env.authenticatedContext('beto').firestore();
    await assertFails(getDoc(doc(db, 'users/ana/items/i1')));
    await assertFails(setDoc(doc(db, 'users/ana/items/i2'), ITEM));
    await assertFails(deleteDoc(doc(db, 'users/ana/items/i1')));
  });

  it('sin autenticar, nada', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'users/ana/items/i1'), ITEM));
    await assertFails(getDoc(doc(db, 'users/ana/items/i1')));
  });
});

describe('todo lo demás sigue negado (Fase 4 todavía no existe)', () => {
  it('un usuario autenticado no puede escribir fuera de users/{uid}', async () => {
    const db = env.authenticatedContext('ana').firestore();
    await assertFails(setDoc(doc(db, 'spaces/s1'), { ownerUid: 'ana' }));
  });
});
