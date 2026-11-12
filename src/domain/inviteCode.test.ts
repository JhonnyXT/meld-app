import { generateInviteCode } from './inviteCode';

describe('generateInviteCode', () => {
  it('produce 6 caracteres, todos del alfabeto sin 0/O/1/I', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });

  it('no repite siempre el mismo código', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
