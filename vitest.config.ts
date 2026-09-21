import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Integration tests import 'vscode' and only run inside the Extension
    // Development Host via @vscode/test-electron (see test/integration).
    exclude: ['test/integration/**', 'node_modules/**'],
  },
});
