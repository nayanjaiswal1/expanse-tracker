// Flat ESLint config for React + TypeScript (ESLint v9)
// See: https://eslint.org/docs/latest/use/configure/configuration-files-new

import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import reactRefresh from 'eslint-plugin-react-refresh';
import i18next from 'eslint-plugin-i18next';
import customUi from './eslint-rules/no-raw-button.js';

const jsRecommended = {
  ...js.configs.recommended,
  languageOptions: {
    ...(js.configs.recommended.languageOptions ?? {}),
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: {
      ...globals.browser,
      ...globals.node,
      ...(js.configs.recommended.languageOptions?.globals ?? {}),
    },
  },
};

export default [
  {
    ignores: ['dist', 'node_modules', 'coverage', 'eslint_output.txt', 'scripts', 'docs', 'public', 'tailwind.config.js', 'src'],
  },
  jsRecommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: false,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      i18next,
      'custom-ui': customUi,
    },
    rules: {
      // React core
      ...react.configs.recommended.rules,
      // React Hooks v7 recommended
      ...reactHooks.configs.recommended.rules,
      // TypeScript (non type-checked for faster linting)
      ...tseslint.configs.recommended?.rules,
      'react-refresh/only-export-components': 'off',
      // Modern JSX runtime doesn't require React in scope
      'react/react-in-jsx-scope': 'off',
      // TS/JS tweaks
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'i18next/no-literal-string': 'off',
      'custom-ui/no-raw-button': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react/no-unescaped-entities': 'off',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
];
