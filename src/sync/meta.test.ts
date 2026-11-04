import { advanceCursor, emptyMeta } from './meta';

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
});
