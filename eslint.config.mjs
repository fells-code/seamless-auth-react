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
    files: ['**/*.ssr.test.ts', '**/*.ssr.test.tsx', '**/*.node.test.ts'],
    rules: {
      'license-header/header': 'off',
    },
  },
  {
    // @seamless-auth/client is the framework-agnostic core every binding shares,
    // so nothing React (or from a binding) may enter it. See #64.
    files: ['packages/client/src/**/*.ts'],
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
                'react-native',
                'react-native/*',
                '@angular/*',
                'vue',
                'vue-router',
                'svelte',
                'svelte/*',
                '@sveltejs/*',
                '$app/*',
                'rxjs',
                'rxjs/*',
              ],
              message:
                'The client core must stay framework agnostic. Keep React, Angular, Vue, Svelte and router imports in a binding package. See #64.',
            },
            {
              group: [
                '@seamless-auth/react',
                '@seamless-auth/react-native',
                '@seamless-auth/angular',
                '@seamless-auth/angular/*',
                '@seamless-auth/vue',
                '@seamless-auth/vue/*',
                '@seamless-auth/svelte',
                '@seamless-auth/svelte/*',
                '../react/*',
              ],
              message: 'The client core must not import from a binding package. See #64.',
            },
          ],
        },
      ],
    },
  },
  {
    // Svelte's runes are compiler keywords in .svelte.ts modules, not imports.
    files: ['packages/svelte/**/*.svelte.ts'],
    languageOptions: {
      globals: {
        $state: 'readonly',
        $derived: 'readonly',
        $effect: 'readonly',
        $props: 'readonly',
        $bindable: 'readonly',
      },
    },
  },
  {
    // Vue composables are named use* too, and the React hooks rules misread them.
    files: ['packages/vue/**/*.ts', 'packages/svelte/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    ignores: [
      '**/dist/',
      '**/coverage/',
      '**/node_modules/',
      '**/.svelte-kit/',
      '**/*.generated.ts',
    ],
  },
];
