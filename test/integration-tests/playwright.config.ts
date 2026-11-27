import { defineConfig, devices } from '@playwright/test';
import { coverageEnabled } from './coverage';

export default defineConfig({
  testDir: './',
  globalSetup: coverageEnabled ? './coverage-setup.ts' : undefined,
  globalTeardown: coverageEnabled ? './coverage-teardown.ts' : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  use: {
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  webServer: [
    {
      name: 'simple',
      command: 'npm run serve:simple',
      url: 'http://localhost:8000',
      reuseExistingServer: !process.env.CI
    },
    {
      name: 'cross-origin',
      command: 'npm run serve:cross-origin',
      url: 'http://localhost:8001',
      reuseExistingServer: !process.env.CI
    },
    {
      name: 'cors-proxy',
      command: 'npm run serve:cors-proxy',
      url: 'http://localhost:8881',
      reuseExistingServer: !process.env.CI
    }
  ]
});
