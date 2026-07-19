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
    // The client layer stays framework agnostic so it can be extracted into a
    // shared package for non-React adapters. See #64.
    files: [
      'src/client/**/*.ts',
      'src/fetchWithAuth.ts',
      'src/scopedRoles.ts',
      'src/types.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'react-router',
                'react-router-dom',
              ],
              message:
                'The client layer must stay framework agnostic. Keep React and router imports in the binding layer. See #64.',
            },
            {
              group: [
                '@/AuthProvider',
                '@/AuthRoutes',
                '@/hooks/*',
                '@/views/*',
                '@/components/*',
                '**/AuthProvider',
                '**/AuthRoutes',
                '**/hooks/*',
                '**/views/*',
                '**/components/*',
              ],
              message:
                'The client layer must not import from the React binding layer. See #64.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/', 'coverage/', 'node_modules/'],
  },
];
