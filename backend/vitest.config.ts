import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests run against TEST_DATABASE_URL, never the dev database.
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
  },
});
