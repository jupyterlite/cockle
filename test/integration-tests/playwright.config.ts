import { defineConfig, devices } from '@playwright/test';
import { coverageEnabled } from './coverage';
import type { TestOptions } from './utils';

export default defineConfig<TestOptions>({
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
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8000',
        supportsSAB: false
      }
    },
    {
      name: 'chromium-coi',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8001',
        supportsSAB: true
      }
    }
  ],
  webServer: {
    name: 'simple',
    command: 'npm run serve',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI
  }
});
