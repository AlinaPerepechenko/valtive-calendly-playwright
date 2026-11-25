import { test } from '@playwright/test';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Waits until ANY of the locators is visible and returns its index.
 * Works across frames (main page + Calendly iframe), unlike `a.or(b)`.
 * Implemented as ONE report step that polls `isVisible()` (no waiting calls),
 * so the outcomes that did not happen are not shown as failed steps.
 */
export async function waitForAny(locators, timeout = 30_000, title = 'Wait for one of the possible results') {
  return test.step(
    title,
    async () => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        for (const [i, locator] of locators.entries()) {
          if (await locator.isVisible().catch(() => false)) return i;
        }
        await sleep(500);
      }
      throw new Error(`None of ${locators.length} expected elements appeared within ${timeout / 1000}s`);
    },
    { box: true }
  );
}
