import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked.map((config) => ({
        ...config,
        files: ['src/**/*.ts', 'test/**/*.ts'],
    })),
    {
        files: ['src/**/*.ts', 'test/**/*.ts'],
        languageOptions: {
            globals: globals.browser,
            parserOptions: {
                project: ['./tsconfig.json', './tsconfig.test.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
        },
    },
    {
        files: ['**/*.mjs'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.bunBuiltin,
            },
        },
    },
);
