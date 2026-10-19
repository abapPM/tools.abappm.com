const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2019,
            sourceType: 'module',
            globals: globals.node,
        },
        rules: {
            quotes: ['error', 'single', { avoidEscape: true }],
            semi: ['error', 'always', { omitLastInOneLineBlock: true }],
            'no-console': 'off',
            'no-trailing-spaces': ['error'],
            indent: ['error', 4],
        },
    },
    {
        files: ['eslint.config.js'],
        languageOptions: {
            sourceType: 'commonjs',
        },
    },
];
