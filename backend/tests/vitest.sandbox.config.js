import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['modules/**/*.test.js'],
    root: __dirname,
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    globalSetup: resolve(__dirname, './setup/global-setup.mjs'),
    reporters: [
      'verbose',
      [resolve(__dirname, './reporters/vitest-pz-reporter.js'), { outputFile: resolve(__dirname, './reports/results-sandbox.json') }],
    ],
  },
});
