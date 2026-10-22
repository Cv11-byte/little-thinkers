import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  // on GitHub: failures show up as annotations; one retry for timing hiccups on the slower machines
  reporter: process.env.CI ? [['github'], ['line']] : 'line',
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['iPad Pro 11 landscape'],
    browserName: 'chromium',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
  },
});
