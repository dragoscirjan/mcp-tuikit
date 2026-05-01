import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests spawn real terminals; suites must run one at a time
    // to avoid concurrent terminal conflicts and resource contention.
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts', 'packages/*/src/**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
          testTimeout: 300_000,
        },
      },
    ],
  },
});
