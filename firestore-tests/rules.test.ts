/**
 * Reglas de Firestore (firestore.rules) contra el emulador. No corren en `npm test`: necesitan el
 * emulador. Correr con `npm run test:rules` (scripts/test-rules.sh lo levanta y lo apaga).
 *
 * Fase 3 (SYNC_ROADMAP.md): cada usuario solo lee/escribe lo suyo, bajo users/{uid}. Fase 4:
 * espacios compartidos (spaces/{id}, diseño adaptado de my-wallet-app/firestore.rules) e
 * inviteCodes/{code} — todo lo demás sigue negado.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

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

it('fuera de users/ y spaces/ todo se niega, aun con sesión', async () => {
  const db = env.authenticatedContext('ana').firestore();
  await assertFails(setDoc(doc(db, 'otra/cosa'), { name: 'x' }));
  await assertFails(getDoc(doc(db, 'otra/cosa')));
});

// ─── Espacios compartidos (Fase 4) ──────────────────────────────────────────────

const IN_7_DAYS = () => Timestamp.fromMillis(Date.now() + 7 * 86400000);
const AGO = () => Timestamp.fromMillis(Date.now() - 1000);
const SITEM = (title: string) => ({
  title,
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

/** Espacio "s1" de ana, sin pasar por las reglas. */
async function seedSpace(
  opts: {
    memberUids?: string[];
    /** Omitido = espacio "legado" sin este campo, para probar la compatibilidad (todos editores). */
    editorUids?: string[];
    code?: { id: string; expiresAt: Timestamp; spaceId?: string; role?: 'editor' | 'viewer' };
  } = {},
) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'spaces/s1'), {
      ownerUid: 'ana',
      memberUids: opts.memberUids ?? ['ana'],
      ...(opts.editorUids ? { editorUids: opts.editorUids } : {}),
      deletedAt: null,
    });
    await setDoc(doc(db, 'spaces/s1/members/ana'), { name: 'Ana', updatedAt: '2026-01-01T00:00:00.000Z' });
    await setDoc(doc(db, 'spaces/s1/config/category'), { label: 'Casa', icon: 'home', color: '#4F84FF' });
    await setDoc(doc(db, 'spaces/s1/items/i1'), SITEM('Comprar leche'));
    if (opts.code) {
      await setDoc(doc(db, `inviteCodes/${opts.code.id}`), {
        spaceId: opts.code.spaceId ?? 's1',
        createdBy: 'ana',
        ...(opts.code.role ? { role: opts.code.role } : {}),
        expiresAt: opts.code.expiresAt,
      });
    }
  });
}

describe('spaces: crear', () => {
  it('el dueño crea espacio, su miembro y la config en un mismo lote', async () => {
    const db = as('ana');
    const batch = writeBatch(db);
    batch.set(doc(db, 'spaces/s1'), { ownerUid: 'ana', memberUids: ['ana'], editorUids: ['ana'], deletedAt: null });
    batch.set(doc(db, 'spaces/s1/members/ana'), { name: 'Ana', updatedAt: '2026-01-01T00:00:00.000Z' });
    batch.set(doc(db, 'spaces/s1/config/category'), { label: 'Casa', icon: 'home', color: '#4F84FF' });
    await assertSucceeds(batch.commit());
    await assertSucceeds(setDoc(doc(db, 'inviteCodes/K7Q2MX'), { spaceId: 's1', createdBy: 'ana', expiresAt: IN_7_DAYS() }));
  });

  it('no se crea un espacio a nombre de otro ni con otros miembros', async () => {
    const db = as('ana');
    await assertFails(setDoc(doc(db, 'spaces/s1'), { ownerUid: 'beto', memberUids: ['beto'] }));
    await assertFails(setDoc(doc(db, 'spaces/s1'), { ownerUid: 'ana', memberUids: ['ana', 'beto'] }));
  });

  it('un código no pisa otro existente, ni vence en más de 8 días, ni es de un espacio ajeno', async () => {
    await seedSpace({ code: { id: 'K7Q2MX', expiresAt: IN_7_DAYS() } });
    const db = as('ana');
    await assertFails(setDoc(doc(db, 'inviteCodes/K7Q2MX'), { spaceId: 's1', createdBy: 'ana', expiresAt: IN_7_DAYS() }));
    await assertFails(
      setDoc(doc(db, 'inviteCodes/AAAAAA'), {
        spaceId: 's1',
        createdBy: 'ana',
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000),
      }),
    );
    await assertFails(setDoc(doc(as('beto'), 'inviteCodes/BBBBBB'), { spaceId: 's1', createdBy: 'beto', expiresAt: IN_7_DAYS() }));
  });
});

describe('spaces: leer y escribir', () => {
  it('un miembro lee todo y registra o edita cualquier ítem', async () => {
    await seedSpace({ memberUids: ['ana', 'beto'] });
    const db = as('beto');
    await assertSucceeds(getDoc(doc(db, 'spaces/s1')));
    await assertSucceeds(getDocs(collection(db, 'spaces/s1/members')));
    await assertSucceeds(getDoc(doc(db, 'spaces/s1/config/category')));
    await assertSucceeds(getDocs(collection(db, 'spaces/s1/items')));
    await assertSucceeds(setDoc(doc(db, 'spaces/s1/items/i2'), SITEM('Pasear al perro')));
    await assertSucceeds(setDoc(doc(db, 'spaces/s1/habitCompletions/h1'), { habitId: 'h', date: '2026-01-01', updatedAt: '2026-01-01T00:00:00.000Z' }));
    await assertSucceeds(setDoc(doc(db, 'spaces/s1/config/category'), { label: 'Casa 2', icon: 'home', color: '#4F84FF' }));
    // Edita el de otro.
    await assertSucceeds(setDoc(doc(db, 'spaces/s1/items/i1'), { ...SITEM('Comprar leche'), title: 'Comprar pan' }));
  });

  it('un no miembro no lee ni escribe nada del espacio', async () => {
    await seedSpace();
    const db = as('beto');
    await assertFails(getDoc(doc(db, 'spaces/s1')));
    await assertFails(getDocs(collection(db, 'spaces/s1/items')));
    await assertFails(getDoc(doc(db, 'spaces/s1/config/category')));
    await assertFails(setDoc(doc(db, 'spaces/s1/items/i2'), SITEM('Intruso')));
    await assertFails(setDoc(doc(db, 'spaces/s1/members/beto'), { name: 'Beto', updatedAt: '2026-01-01T00:00:00.000Z' }));
  });

  it('descubrir: listar solo los espacios donde soy miembro', async () => {
    await seedSpace({ memberUids: ['ana', 'beto'] });
    await assertSucceeds(getDocs(query(collection(as('beto'), 'spaces'), where('memberUids', 'array-contains', 'beto'))));
    await assertFails(getDocs(collection(as('beto'), 'spaces')));
  });
});

describe('spaces: unirse con código', () => {
  // Los códigos de este describe son de editor por defecto (sin `role`, ver seedSpace): unirse
  // también toca `editorUids`. Los casos de lector están en el describe de roles.
  const join = (uid: string, code: string) =>
    updateDoc(doc(as(uid), 'spaces/s1'), { memberUids: arrayUnion(uid), joinCode: code, editorUids: arrayUnion(uid) });

  it('con un código vigente de este espacio, se agrega a sí mismo y crea su miembro', async () => {
    await seedSpace({ code: { id: 'K7Q2MX', expiresAt: IN_7_DAYS() } });
    await assertSucceeds(getDoc(doc(as('beto'), 'inviteCodes/K7Q2MX')));
    await assertSucceeds(join('beto', 'K7Q2MX'));
    await assertSucceeds(setDoc(doc(as('beto'), 'spaces/s1/members/beto'), { name: 'Beto', updatedAt: '2026-01-01T00:00:00.000Z' }));
  });

  it('sin código, con uno vencido, inexistente o de otro espacio, no', async () => {
    await seedSpace({ code: { id: 'VENCID', expiresAt: AGO() } });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'inviteCodes/OTROSP'), { spaceId: 's2', createdBy: 'ana', expiresAt: IN_7_DAYS() });
    });
    await assertFails(updateDoc(doc(as('beto'), 'spaces/s1'), { memberUids: arrayUnion('beto') }));
    await assertFails(join('beto', 'VENCID'));
    await assertFails(join('beto', 'NOEXIS'));
    await assertFails(join('beto', 'OTROSP'));
  });

  it('no puede agregar a otra persona, ni a sí mismo y a otra', async () => {
    await seedSpace({ code: { id: 'K7Q2MX', expiresAt: IN_7_DAYS() } });
    await assertFails(updateDoc(doc(as('beto'), 'spaces/s1'), { memberUids: arrayUnion('caro'), joinCode: 'K7Q2MX' }));
    await assertFails(updateDoc(doc(as('beto'), 'spaces/s1'), { memberUids: ['ana', 'beto', 'caro'], joinCode: 'K7Q2MX' }));
  });

  it('no puede volverse dueño ni tocar otros campos al unirse', async () => {
    await seedSpace({ code: { id: 'K7Q2MX', expiresAt: IN_7_DAYS() } });
    await assertFails(
      updateDoc(doc(as('beto'), 'spaces/s1'), { memberUids: arrayUnion('beto'), joinCode: 'K7Q2MX', ownerUid: 'beto' }),
    );
  });

  it('no se une a un espacio eliminado', async () => {
    await seedSpace({ code: { id: 'K7Q2MX', expiresAt: IN_7_DAYS() } });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'spaces/s1'), { deletedAt: '2026-01-02T00:00:00.000Z' });
    });
    await assertFails(join('beto', 'K7Q2MX'));
  });

  it('los códigos no se enumeran', async () => {
    await seedSpace({ code: { id: 'K7Q2MX', expiresAt: IN_7_DAYS() } });
    await assertFails(getDocs(collection(as('beto'), 'inviteCodes')));
    await assertSucceeds(getDocs(query(collection(as('ana'), 'inviteCodes'), where('createdBy', '==', 'ana'))));
  });
});

describe('spaces: límite de miembros (T10)', () => {
  it('el miembro número 7 no puede unirse (máximo 6)', async () => {
    const full = ['ana', 'm2', 'm3', 'm4', 'm5', 'm6'];
    await seedSpace({ memberUids: full, editorUids: full, code: { id: 'K7Q2MX', expiresAt: IN_7_DAYS() } });
    await assertFails(
      updateDoc(doc(as('beto'), 'spaces/s1'), { memberUids: arrayUnion('beto'), joinCode: 'K7Q2MX', editorUids: arrayUnion('beto') }),
    );
  });

  it('el sexto sí puede unirse', async () => {
    const five = ['ana', 'm2', 'm3', 'm4', 'm5'];
    await seedSpace({ memberUids: five, editorUids: five, code: { id: 'K7Q2MX', expiresAt: IN_7_DAYS() } });
    await assertSucceeds(
      updateDoc(doc(as('beto'), 'spaces/s1'), { memberUids: arrayUnion('beto'), joinCode: 'K7Q2MX', editorUids: arrayUnion('beto') }),
    );
  });
});

describe('spaces: roles editor/lector (T11)', () => {
  it('un código de editor agrega también a editorUids; uno de lector, no', async () => {
    await seedSpace({ memberUids: ['ana'], editorUids: ['ana'], code: { id: 'EDITOR', expiresAt: IN_7_DAYS(), role: 'editor' } });
    await assertSucceeds(
      updateDoc(doc(as('beto'), 'spaces/s1'), { memberUids: arrayUnion('beto'), joinCode: 'EDITOR', editorUids: arrayUnion('beto') }),
    );
  });

  it('con código de lector, agregarse también a editorUids se rechaza (no se autopromueve)', async () => {
    await seedSpace({ memberUids: ['ana'], editorUids: ['ana'], code: { id: 'VIEWER', expiresAt: IN_7_DAYS(), role: 'viewer' } });
    await assertFails(
      updateDoc(doc(as('beto'), 'spaces/s1'), { memberUids: arrayUnion('beto'), joinCode: 'VIEWER', editorUids: arrayUnion('beto') }),
    );
    // Sin tocar editorUids sí se une, como lector.
    await assertSucceeds(updateDoc(doc(as('beto'), 'spaces/s1'), { memberUids: arrayUnion('beto'), joinCode: 'VIEWER' }));
  });

  it('un lector no crea ni edita ítems ni config, pero sí lee', async () => {
    await seedSpace({ memberUids: ['ana', 'beto'], editorUids: ['ana'] });
    const db = as('beto');
    await assertSucceeds(getDocs(collection(db, 'spaces/s1/items')));
    await assertSucceeds(getDoc(doc(db, 'spaces/s1/config/category')));
    await assertFails(setDoc(doc(db, 'spaces/s1/items/i2'), SITEM('Intruso')));
    await assertFails(setDoc(doc(db, 'spaces/s1/items/i1'), { ...SITEM('Comprar leche'), title: 'x' }));
    await assertFails(setDoc(doc(db, 'spaces/s1/config/category'), { label: 'x', icon: 'home', color: '#000' }));
  });

  it('un editor sí registra y edita ítems y config', async () => {
    await seedSpace({ memberUids: ['ana', 'beto'], editorUids: ['ana', 'beto'] });
    const db = as('beto');
    await assertSucceeds(setDoc(doc(db, 'spaces/s1/items/i2'), SITEM('Pasear al perro')));
    await assertSucceeds(setDoc(doc(db, 'spaces/s1/config/category'), { label: 'x', icon: 'home', color: '#000' }));
  });

  it('solo el dueño cambia roles; un miembro no se autopromueve ni degrada a otro', async () => {
    await seedSpace({ memberUids: ['ana', 'beto', 'caro'], editorUids: ['ana'] });
    await assertFails(updateDoc(doc(as('beto'), 'spaces/s1'), { editorUids: arrayUnion('beto') }));
    await assertFails(updateDoc(doc(as('beto'), 'spaces/s1'), { editorUids: ['ana'] }));
    await assertSucceeds(updateDoc(doc(as('ana'), 'spaces/s1'), { editorUids: arrayUnion('beto') }));
  });

  it('el dueño no se puede quitar a sí mismo de editorUids, ni meter a alguien que no es miembro', async () => {
    await seedSpace({ memberUids: ['ana', 'beto'], editorUids: ['ana'] });
    await assertFails(updateDoc(doc(as('ana'), 'spaces/s1'), { editorUids: arrayRemove('ana') }));
    await assertFails(updateDoc(doc(as('ana'), 'spaces/s1'), { editorUids: arrayUnion('caro') }));
  });

  it('legado sin editorUids: todos los miembros son editores', async () => {
    await seedSpace({ memberUids: ['ana', 'beto'] });
    await assertSucceeds(setDoc(doc(as('beto'), 'spaces/s1/items/i2'), SITEM('Pasear al perro')));
  });

  it('un lector solo invita como lector; invitar como editor exige ser editor', async () => {
    await seedSpace({ memberUids: ['ana', 'beto'], editorUids: ['ana'] });
    await assertFails(setDoc(doc(as('beto'), 'inviteCodes/BETOED'), { spaceId: 's1', createdBy: 'beto', role: 'editor', expiresAt: IN_7_DAYS() }));
    await assertSucceeds(setDoc(doc(as('beto'), 'inviteCodes/BETOVW'), { spaceId: 's1', createdBy: 'beto', role: 'viewer', expiresAt: IN_7_DAYS() }));
    await assertSucceeds(setDoc(doc(as('ana'), 'inviteCodes/ANAED1'), { spaceId: 's1', createdBy: 'ana', role: 'editor', expiresAt: IN_7_DAYS() }));
  });
});

describe('spaces: mi propio miembro', () => {
  it('cualquier miembro registra o edita su propia fila; el dueño también la de otro', async () => {
    await seedSpace({ memberUids: ['ana', 'beto', 'caro'] });
    await assertSucceeds(setDoc(doc(as('beto'), 'spaces/s1/members/beto'), { name: 'Beto', updatedAt: '2026-01-01T00:00:00.000Z' }));
    await assertSucceeds(updateDoc(doc(as('beto'), 'spaces/s1/members/beto'), { name: 'B' }));
    await assertSucceeds(updateDoc(doc(as('ana'), 'spaces/s1/members/beto'), { leftAt: '2026-01-02T00:00:00.000Z' }));
  });

  it('no edita ni crea la fila de otro miembro', async () => {
    await seedSpace({ memberUids: ['ana', 'beto', 'caro'] });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'spaces/s1/members/beto'), { name: 'Beto', updatedAt: '2026-01-01T00:00:00.000Z' });
    });
    await assertFails(updateDoc(doc(as('caro'), 'spaces/s1/members/beto'), { leftAt: '2026-01-02T00:00:00.000Z' }));
    await assertFails(setDoc(doc(as('caro'), 'spaces/s1/members/beto'), { name: 'Suplantado', updatedAt: '2026-01-01T00:00:00.000Z' }));
  });
});

describe('spaces: salir, quitar, eliminar', () => {
  it('un miembro sale (leftAt + quitarse en un lote) y deja de leer', async () => {
    await seedSpace({ memberUids: ['ana', 'beto'] });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'spaces/s1/members/beto'), { name: 'Beto', updatedAt: '2026-01-01T00:00:00.000Z' });
    });
    const db = as('beto');
    const batch = writeBatch(db);
    batch.update(doc(db, 'spaces/s1/members/beto'), { leftAt: '2026-01-02T00:00:00.000Z' });
    batch.update(doc(db, 'spaces/s1'), { memberUids: arrayRemove('beto') });
    await assertSucceeds(batch.commit());
    await assertFails(getDocs(collection(db, 'spaces/s1/items')));
  });

  it('un miembro no quita a otro; el dueño sí, pero no agrega ni se quita a sí mismo', async () => {
    await seedSpace({ memberUids: ['ana', 'beto', 'caro'] });
    await assertFails(updateDoc(doc(as('beto'), 'spaces/s1'), { memberUids: arrayRemove('caro') }));
    await assertFails(updateDoc(doc(as('ana'), 'spaces/s1'), { memberUids: arrayUnion('dani') }));
    await assertFails(updateDoc(doc(as('ana'), 'spaces/s1'), { memberUids: arrayRemove('ana') }));
    await assertSucceeds(updateDoc(doc(as('ana'), 'spaces/s1'), { memberUids: arrayRemove('caro') }));
    await assertFails(getDoc(doc(as('caro'), 'spaces/s1/config/category')));
  });

  it('el dueño elimina: marca, borra todo y los demás dejan de leer', async () => {
    await seedSpace({ memberUids: ['ana', 'beto'] });
    const db = as('ana');
    await assertSucceeds(updateDoc(doc(db, 'spaces/s1'), { deletedAt: '2026-01-02T00:00:00.000Z' }));
    // Marcado: el doc se sigue leyendo (para enterarse), lo de adentro ya no.
    await assertSucceeds(getDoc(doc(as('beto'), 'spaces/s1')));
    await assertFails(getDocs(collection(as('beto'), 'spaces/s1/items')));
    // El dueño sí lista lo de adentro para borrarlo.
    await assertSucceeds(getDocs(collection(db, 'spaces/s1/items')));
    await assertSucceeds(getDocs(collection(db, 'spaces/s1/members')));
    await assertSucceeds(deleteDoc(doc(db, 'spaces/s1/items/i1')));
    await assertSucceeds(deleteDoc(doc(db, 'spaces/s1/members/ana')));
    await assertSucceeds(deleteDoc(doc(db, 'spaces/s1/config/category')));
    await assertSucceeds(deleteDoc(doc(db, 'spaces/s1')));
  });

  it('un miembro que no es dueño no elimina ni borra de verdad', async () => {
    await seedSpace({ memberUids: ['ana', 'beto'] });
    const db = as('beto');
    await assertFails(updateDoc(doc(db, 'spaces/s1'), { deletedAt: '2026-01-02T00:00:00.000Z' }));
    await assertFails(deleteDoc(doc(db, 'spaces/s1/items/i1')));
    await assertFails(deleteDoc(doc(db, 'spaces/s1')));
  });
});
