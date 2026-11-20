// Browser tests against a running server (production build recommended):
//   npm run build && npx next start -p 3100   then   npm run e2e
// Uses the Edge installed with Windows (channel msedge): no browser download.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 2,
  reporter: 'list',
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100', channel: process.env.E2E_CHANNEL ?? 'msedge' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }, testMatch: /(ui|world)\.spec/ },
  ],
});
