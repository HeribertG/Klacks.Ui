import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'src/app': resolve(__dirname, '../../../app'),
      'src/environments': resolve(__dirname, '../../../environments'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    reporters: ['verbose'],
    testTimeout: 10000,
  },
});
