import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'src/app': resolve(__dirname, './src/app'),
      'src/environments': resolve(__dirname, './src/environments'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    reporters: ['verbose'],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks',
    teardownTimeout: 1000,
  },
});
