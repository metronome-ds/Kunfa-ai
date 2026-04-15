import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'https://www.kunfa.ai',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    headless: true,
  },
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['./tests/e2e/reporters/linear-reporter.ts'],
  ],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
