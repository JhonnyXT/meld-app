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

it('src/sync/ sí los importa (la guardia mira el lugar correcto)', () => {
  const sync = sourceFiles(join(ROOT, 'src', 'sync'));
  expect(sync.some((f) => NETWORK_IMPORT.test(readFileSync(f, 'utf8')))).toBe(true);
});
