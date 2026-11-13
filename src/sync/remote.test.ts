jest.mock('./firebase', () => ({ ensureFirebase: () => undefined }));

jest.mock('@react-native-firebase/firestore', () => ({
  Timestamp: class {
    ms: number;
    constructor(ms: number) {
      this.ms = ms;
    }
    static fromMillis(ms: number) {
      return new this(ms);
    }
    toMillis() {
      return this.ms;
    }
  },
}));

import { Timestamp } from '@react-native-firebase/firestore';
import { millis } from './remote';

describe('millis', () => {
  it('convierte un Timestamp de Firestore a epoch ms', () => {
    const ts = Timestamp.fromMillis(1_700_000_000_000);
    expect(millis(ts)).toBe(1_700_000_000_000);
  });

  it('devuelve 0 para cualquier valor que no sea un Timestamp', () => {
    expect(millis(null)).toBe(0);
    expect(millis(undefined)).toBe(0);
    expect(millis(1_700_000_000_000)).toBe(0);
    expect(millis('2026-11-13')).toBe(0);
  });
});
