import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: './node_modules/.bin/next dev --webpack -H 127.0.0.1 -p 3000',
    cwd: '.',
    env: {
      ...process.env,
      TRACKING_SERVICE_URL: process.env.TRACKING_SERVICE_URL ?? 'http://127.0.0.1:3303',
    },
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
