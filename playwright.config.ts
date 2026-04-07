import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3003',
    viewport: { width: 1280, height: 800 },
    screenshot: 'off',
  },
  webServer: process.env.CI
    ? undefined
    : {
        command: 'node server.js',
        port: 3003,
        reuseExistingServer: true,
      },
});
