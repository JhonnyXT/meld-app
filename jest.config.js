/** @type {import('jest').Config} */
module.exports = {
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
  },
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo-crypto$': '<rootDir>/jest/expoCryptoMock.js',
    '^expo-sqlite$': '<rootDir>/jest/expoSqliteMock.js',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/.expo/',
    '<rootDir>/landing/',
    // Necesitan el emulador de Firestore: npm run test:rules (jest.rules.config.js), no npm test.
    '<rootDir>/firestore-tests/',
  ],
};
