import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.FOCUS_TEST_PORT ?? '4173');
const baseURL = `http://127.0.0.1:${String(port)}`;

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  reporter: [['line']],
  use: {
    baseURL,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${String(port)}`,
    url: `${baseURL}/only-tdy/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
