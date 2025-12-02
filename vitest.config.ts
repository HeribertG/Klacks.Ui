import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/results.json',
    },
  },
});
