const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactHooks = require('eslint-plugin-react-hooks');
const globals = require('globals');

/** Config mínima pero real: detecta lo más barato de arreglar (variables/imports sin usar,
 * dependencias de hooks mal declaradas, `any` implícito) sin imponer un estilo de formato propio
 * (no hay Prettier en este proyecto — no se agrega acá tampoco). Sin preset de Expo/React Native:
 * los que existen hoy (`eslint-config-expo`) solo publican versiones para Expo 58, y este proyecto
 * está pineado a Expo SDK 57 a propósito (ver CLAUDE.md) — instalarlo arrastraría peer deps de la
 * versión equivocada. */
module.exports = [
  {
    ignores: ['node_modules/**', 'android/**', 'ios/**', '.expo/**', 'dist/**', 'landing/**', '*.config.js'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      globals: { ...globals.node, ...globals.es2021 },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-undef': 'off', // TypeScript ya lo cubre; con JSX da falsos positivos sin el plugin de React completo.
    },
  },
  {
    files: ['**/*.test.ts', 'jest/**', 'firestore-tests/**'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
];
