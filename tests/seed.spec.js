import { test } from '../src/fixtures/fixtures';

/**
 * Seed test for Playwright Test Agents.
 * The planner/generator agents run this first to get into the right
 * starting state: contact page opened and Calendly calendar loaded.
 */
test('seed', async ({ contactPage, calendly }) => {
  await contactPage.open();
  await calendly.waitForCalendar();
});
