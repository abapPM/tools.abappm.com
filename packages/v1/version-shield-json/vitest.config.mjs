import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['handler.test.js', 'lib/**/*.test.js'],
    },
});
