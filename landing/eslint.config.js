import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist', 'node_modules', 'public'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: { globals: { ...globals.browser } },
    },
    {
        files: ['build/**/*.{ts,mjs}', '*.config.ts'],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
    },
    prettier,
);
