/**
 * Guardia estática de la Regla #3 de SYNC_ROADMAP.md: la red (Firebase / Google Sign-In) solo
 * vive en `src/sync/`. Pantallas, stores, hooks, repositorios y utilidades importan la API de
 * `@/sync`, nunca Firebase directo.
 *
 * El segundo `it` (src/sync/ sí los importa) se agrega cuando este directorio tenga código real
 * con un import de Firebase/Google Sign-In — todavía no, src/sync/ está vacío (Fase 2, antes de
 * instalar @react-native-firebase/*). Sin ese código, esa aserción sería un falso positivo.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..', '..');
const SCANNED = ['app', 'src', 'index.js'];
const NETWORK_IMPORT =
  /from\s+["'](@react-native-firebase\/|@react-native-google-signin\/|firebase\/)/;

function sourceFiles(path: string): string[] {
  if (statSync(path).isFile()) return /\.(tsx?|jsx?)$/.test(path) ? [path] : [];
  return readdirSync(path).flatMap((name) => sourceFiles(join(path, name)));
}

const offenders = SCANNED.flatMap((p) => sourceFiles(join(ROOT, p)))
  .map((file) => relative(ROOT, file))
  .filter((file) => !file.startsWith(join('src', 'sync')))
  .filter((file) => NETWORK_IMPORT.test(readFileSync(join(ROOT, file), 'utf8')));

it('ningún archivo fuera de src/sync/ importa Firebase ni Google Sign-In', () => {
  expect(offenders).toEqual([]);
});
