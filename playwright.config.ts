import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for AI Job Hunting E2E tests
 * Tests run against preview.html with mock platform
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

  webServer: {
    command: 'npm run preview:test',
    url: 'http://127.0.0.1:4173/preview.html',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // 增加到 3 分钟以适应 Windows 环境
    stdout: 'pipe', // 捕获输出以便调试
    stderr: 'pipe',
  },
});
