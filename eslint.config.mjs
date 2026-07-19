import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import licenseHeader from 'eslint-plugin-license-header';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'license-header': licenseHeader,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'no-console': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      'license-header/header': ['error', './resources/license-header.js'],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Jest only reads the `@jest-environment` pragma from the first comment in a
    // file, so these suites carry it alongside the license text in one block.
    // The license header is still present, it just is not a byte-for-byte match.
    files: ['**/*.ssr.test.ts', '**/*.ssr.test.tsx'],
    rules: {
      'license-header/header': 'off',
    },
  },
  {
    ignores: ['dist/', 'coverage/', 'node_modules/'],
  },
];
