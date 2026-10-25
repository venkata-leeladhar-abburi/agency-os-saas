import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['.next/**', 'dist/**', 'coverage/**', 'storybook-static/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.mjs', '**/*.cjs', 'scripts/**', '**/*.config.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
  },
];
