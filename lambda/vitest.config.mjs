import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['__tests__/**/*.test.mjs'],
    setupFiles: ['__tests__/setup.mjs'],
    environment: 'node',
    testTimeout: 10000,
  },
});
