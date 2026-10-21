import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      // Keep this tooling addition purely additive: relax rules that would
      // flag existing, unmodified source rather than reformatting it.
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      // Inline <script> blocks in .astro components intentionally use `var`
      // and empty catch blocks for maximum client-side compatibility and
      // safe fallbacks. Keep these as warnings so existing source passes.
      'no-var': 'warn',
      'no-empty': 'warn',
    },
  },
);
