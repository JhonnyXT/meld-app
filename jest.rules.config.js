/** Tests de reglas de Firestore (firestore-tests/): solo con el emulador, ver npm run test:rules. */
/** @type {import('jest').Config} */
module.exports = {
  transform: { '^.+\\.tsx?$': 'babel-jest' },
  testMatch: ['<rootDir>/firestore-tests/**/*.test.ts'],
};
