import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for manual server start
 * Use this when webServer auto-start doesn't work
 * 
 * Usage:
 * Terminal 1: npm run preview:test
 * Terminal 2: npm run test:e2e:manual
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer - assumes server is already running
});
