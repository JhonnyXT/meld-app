/**
 * Reglas de Firestore (firestore.rules) contra el emulador. No corren en `npm test`: necesitan el
 * emulador. Correr con `npm run test:rules` (scripts/test-rules.sh lo levanta y lo apaga).
 *
 * Fase 2 (SYNC_ROADMAP.md): las reglas niegan todo todavía — no hay `users/{uid}` ni `spaces/{id}`
 * reales (eso llega en las Fases 3 y 4, ver el diseño de referencia en
 * my-wallet-app/firestore.rules). Este test solo confirma que el deny-all efectivamente niega,
 * para no descubrir en la Fase 3 que el emulador estaba mal configurado.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-meld',
    firestore: { rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});

afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

it('nadie lee ni escribe nada, ni autenticado', async () => {
  const db = env.authenticatedContext('ana').firestore();
  await assertFails(setDoc(doc(db, 'users/ana/items/i1'), { title: 'Tarea' }));
  await assertFails(getDoc(doc(db, 'users/ana/items/i1')));
});

it('sin autenticar tampoco', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, 'users/ana/items/i1'), { title: 'Tarea' }));
});
