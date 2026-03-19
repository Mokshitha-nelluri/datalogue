import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['packages/*/tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['packages/*/src/**/*.ts'],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 70,
            },
        },
    },
});
//# sourceMappingURL=vitest.config.js.map