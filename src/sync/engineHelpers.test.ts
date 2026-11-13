import { myRole, resolveCompletedByUidForPush } from './engineHelpers';
import type { SpaceDoc } from './mappers';

function spaceDoc(overrides: Partial<SpaceDoc> = {}): SpaceDoc {
  return {
    ownerUid: 'owner-1',
    memberUids: ['owner-1', 'member-1'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('myRole', () => {
  it('es editor si editorUids lo incluye', () => {
    expect(myRole(spaceDoc({ editorUids: ['owner-1'] }), 'owner-1')).toBe('editor');
  });

  it('es viewer si editorUids existe y no lo incluye', () => {
    expect(myRole(spaceDoc({ editorUids: ['owner-1'] }), 'member-1')).toBe('viewer');
  });

  it('sin editorUids (espacio legado), todos los miembros son editores', () => {
    expect(myRole(spaceDoc({ editorUids: undefined }), 'member-1')).toBe('editor');
  });

  it('alguien que no es miembro en absoluto es viewer', () => {
    expect(myRole(spaceDoc({ editorUids: ['owner-1'] }), 'stranger')).toBe('viewer');
  });
});

describe('resolveCompletedByUidForPush', () => {
  it('no está completado: siempre null, sin importar current/uid', () => {
    expect(resolveCompletedByUidForPush('old-uid', false, 'new-uid')).toBeNull();
    expect(resolveCompletedByUidForPush(null, false, 'new-uid')).toBeNull();
  });

  it('completado y ya tenía un uid: conserva el que ya estaba, no lo pisa', () => {
    expect(resolveCompletedByUidForPush('old-uid', true, 'new-uid')).toBe('old-uid');
  });

  it('completado sin uid previo: lo estampa con el uid actual', () => {
    expect(resolveCompletedByUidForPush(null, true, 'new-uid')).toBe('new-uid');
  });

  it('completado sin uid previo y sin sesión: no puede estampar nada', () => {
    expect(resolveCompletedByUidForPush(null, true, null)).toBeNull();
  });
});
