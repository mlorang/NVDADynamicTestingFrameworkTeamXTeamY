import { defineConfig, devices } from '@playwright/test';

// Points at the live GitHub Pages deploy by default. Override to test a local
// build, e.g. `BASE_URL=http://localhost:3000/ npm run test:a11y`.
// The trailing slash matters: scenario URLs are hash routes appended to it.
const BASE_URL = process.env.BASE_URL ?? 'https://mlorang.github.io/nvda-dynamic-testing-webpage/';

export default defineConfig({
  testDir: './tests',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
