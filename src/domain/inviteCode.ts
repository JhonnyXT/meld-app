/** Código de invitación a una categoría compartida (SYNC_ROADMAP.md, Fase 4). 6 caracteres sin
 * 0/O/1/I (se confunden al dictarlos/leerlos en voz alta) — 32⁶ ≈ 10⁹ combinaciones, suficiente
 * para que una colisión al generar sea rarísima (igual `createInviteCode` reintenta si pasa). */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
