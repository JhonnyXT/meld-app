import { advanceCursor, emptyMeta, forgetSpace, spaceCursorKey } from './meta';

describe('advanceCursor', () => {
  it('avanza el cursor de una colección vacía', () => {
    const meta = advanceCursor(emptyMeta(), 'items', 100);
    expect(meta.cursors.items).toBe(100);
  });

  it('nunca retrocede', () => {
    const meta = advanceCursor(advanceCursor(emptyMeta(), 'items', 100), 'items', 50);
    expect(meta.cursors.items).toBe(100);
  });

  it('avanza en empate hacia adelante (no estrictamente mayor no cuenta como retroceso)', () => {
    const meta = advanceCursor(advanceCursor(emptyMeta(), 'items', 100), 'items', 100);
    expect(meta.cursors.items).toBe(100);
  });

  it('no toca otras colecciones', () => {
    const meta = advanceCursor(advanceCursor(emptyMeta(), 'items', 100), 'categories', 50);
    expect(meta.cursors).toEqual({ items: 100, categories: 50 });
  });

  it('un cursor de espacio es independiente del personal y de otro espacio (Fase 4)', () => {
    let meta = advanceCursor(emptyMeta(), 'items', 100);
    meta = advanceCursor(meta, spaceCursorKey('s1', 'items'), 200);
    meta = advanceCursor(meta, spaceCursorKey('s2', 'items'), 300);
    expect(meta.cursors).toEqual({
      items: 100,
      [spaceCursorKey('s1', 'items')]: 200,
      [spaceCursorKey('s2', 'items')]: 300,
    });
  });
});

describe('forgetSpace', () => {
  it('borra solo los cursores de ESE espacio, deja el resto intacto', () => {
    let meta = advanceCursor(emptyMeta(), 'items', 100);
    meta = advanceCursor(meta, spaceCursorKey('s1', 'items'), 200);
    meta = advanceCursor(meta, spaceCursorKey('s1', 'habitCompletions'), 210);
    meta = advanceCursor(meta, spaceCursorKey('s2', 'items'), 300);

    meta = forgetSpace(meta, 's1');

    expect(meta.cursors).toEqual({ items: 100, [spaceCursorKey('s2', 'items')]: 300 });
  });

  it('un espacio sin cursores no rompe nada', () => {
    const meta = advanceCursor(emptyMeta(), 'items', 100);
    expect(forgetSpace(meta, 'nunca-existio').cursors).toEqual({ items: 100 });
  });
});
