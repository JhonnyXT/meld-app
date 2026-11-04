import { pickWinner } from './merge';

describe('pickWinner', () => {
  it('gana la edición más reciente', () => {
    expect(pickWinner({ updatedAt: '2026-01-01T00:00:00.000Z' }, { updatedAt: '2026-01-02T00:00:00.000Z' })).toBe(
      'remote',
    );
    expect(pickWinner({ updatedAt: '2026-01-03T00:00:00.000Z' }, { updatedAt: '2026-01-02T00:00:00.000Z' })).toBe(
      'local',
    );
  });

  it('un borrado más viejo pierde contra una edición más nueva', () => {
    expect(
      pickWinner(
        { updatedAt: '2026-01-03T00:00:00.000Z' },
        { updatedAt: '2026-01-02T00:00:00.000Z', deletedAt: '2026-01-02T00:00:00.000Z' },
      ),
    ).toBe('local');
    expect(
      pickWinner(
        { updatedAt: '2026-01-02T00:00:00.000Z', deletedAt: '2026-01-02T00:00:00.000Z' },
        { updatedAt: '2026-01-03T00:00:00.000Z' },
      ),
    ).toBe('remote');
  });

  it('en empate gana el borrado', () => {
    expect(
      pickWinner(
        { updatedAt: '2026-01-01T00:00:00.000Z' },
        { updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: '2026-01-01T00:00:00.000Z' },
      ),
    ).toBe('remote');
    expect(
      pickWinner(
        { updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: '2026-01-01T00:00:00.000Z' },
        { updatedAt: '2026-01-01T00:00:00.000Z' },
      ),
    ).toBe('local');
  });

  it('en empate sin borrados (o ambos borrados) se queda la local', () => {
    expect(pickWinner({ updatedAt: '2026-01-01T00:00:00.000Z' }, { updatedAt: '2026-01-01T00:00:00.000Z' })).toBe(
      'local',
    );
    expect(
      pickWinner(
        { updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null },
        { updatedAt: '2026-01-01T00:00:00.000Z' },
      ),
    ).toBe('local');
    expect(
      pickWinner(
        { updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: '2025-12-31T00:00:00.000Z' },
        { updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: '2026-01-01T00:00:00.000Z' },
      ),
    ).toBe('local');
  });
});
