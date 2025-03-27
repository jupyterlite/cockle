import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './integration-tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm run serve',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI
  }
});
