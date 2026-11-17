import { test, expect } from '../src/fixtures/fixtures';

// Smoke checks – do NOT create any bookings, safe to run any time.
test.describe('Contact page', () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.open();
  });

  test('shows the contact form fields', async ({ contactPage }) => {
    await expect(contactPage.heading).toBeVisible();
    await expect(contactPage.nameInput).toBeVisible();
    await expect(contactPage.emailInput).toBeVisible();
    await expect(contactPage.messageInput).toBeVisible();
  });

  test('shows the Calendly scheduler with free days', async ({ calendly }) => {
    await calendly.waitForCalendar();
    await expect(calendly.title).toBeVisible();
    await expect(calendly.availableDays.first()).toBeVisible();
  });
});
