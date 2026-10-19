import { defineConfig } from 'vitest/config';

const TEST_TIMEOUT_MS = 15000;

export default defineConfig({
  test: {
    testTimeout: TEST_TIMEOUT_MS,
    hookTimeout: TEST_TIMEOUT_MS,
  },
});
