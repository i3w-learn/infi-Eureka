// TypeScript is pinned to the 6.x line on purpose: typescript-eslint does not
// support TS 7 yet (typescript-eslint#10940), and upgrading silently disables
// linting entirely. Check that issue before bumping it.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
};

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'migrations/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: nodeGlobals },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Maintenance scripts are plain JS and talk to the operator via stderr.
    files: ['scripts/**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
);
