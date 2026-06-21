import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  tseslint.configs.recommended,
  {
    rules: {
      curly: ['error', 'all'],
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'public-static-method',
            'protected-static-method',
            'private-static-method',
            '#private-static-method',
            'public-method',
            'protected-method',
            'private-method',
            '#private-method',
          ],
        },
      ],
    },
  },
]);
