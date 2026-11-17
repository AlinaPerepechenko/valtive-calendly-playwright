/**
 * Waits until ANY of the locators becomes visible and returns its index.
 * Unlike `locatorA.or(locatorB)` it works when the locators live in
 * different frames (main page + Calendly iframe).
 */
export async function waitForAny(locators, timeout = 30_000) {
  try {
    return await Promise.any(
      locators.map((locator, i) => locator.waitFor({ state: 'visible', timeout }).then(() => i))
    );
  } catch {
    throw new Error(`None of ${locators.length} expected elements appeared within ${timeout / 1000}s`);
  }
}
