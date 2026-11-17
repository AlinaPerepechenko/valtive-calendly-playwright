import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  // the cleanup test runs only on demand: npm run bookings:cancel
  testIgnore: process.env.CLEANUP ? [] : ['**/cleanup/**'],
  globalSetup: './src/utils/globalSetup.js',

  // Bookings run one by one: every test takes the first free slot,
  // so parallel workers would race for the same slot.
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'playwright-qase-reporter',
      {
        mode: process.env.QASE_MODE || 'off', // 'testops' = upload results to Qase
        debug: false,
        testops: {
          api: { token: process.env.QASE_TESTOPS_API_TOKEN },
          project: process.env.QASE_TESTOPS_PROJECT,
          uploadAttachments: true,
          run: {
            title: `Calendly booking – ${isCI ? 'CI' : 'local'} – ${new Date().toISOString()}`,
            complete: true,
          },
        },
      },
    ],
  ],

  use: {
    baseURL: 'https://valtive.io',
    timezoneId: 'Europe/Kyiv',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
