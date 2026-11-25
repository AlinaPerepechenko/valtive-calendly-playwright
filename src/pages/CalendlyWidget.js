/**
 * Page Object for the embedded Calendly scheduler.
 * `root` is a FrameLocator (the iframe on the contact page),
 * so every locator below is searched inside the iframe.
 */
export class CalendlyWidget {
  constructor(root) {
    this.root = root;

    // Step 1 – calendar
    // The heading text depends on the widget width:
    // full page = "Select a Date & Time", narrow embed on valtive.io = "Select a Day".
    // The calendar table is named "Select a Day" in both cases, so we use it.
    this.title = root.getByRole('table', { name: 'Select a Day' });
    // Calendly also renders days of the previous/next month but hides them,
    // so we only take visible buttons (`:visible` is a Playwright CSS extension)
    this.anyDay = root.locator('button[aria-label*="available"]:visible');
    // "Times available" (capital T) = free day; "No times available" = disabled day
    this.availableDays = root.locator('button[aria-label*="Times available"]:not([disabled]):visible');
    this.nextMonthButton = root.getByRole('button', { name: 'Go to next month' });

    // Step 2 – time slots
    this.timeButtons = root.locator('button[data-container="time-button"]');
    this.nextButton = root.getByRole('button', { name: /^Next/ });
    // In the narrow layout the time list replaces the calendar → need a way back
    this.backButton = root.getByRole('button', { name: 'Go to previous page' });

    // Step 3 – booking details form
    // Required fields are labelled with an asterisk: "First name *", "Email *"
    this.firstNameInput = root.getByRole('textbox', { name: /^First name/ });
    this.lastNameInput = root.getByRole('textbox', { name: /^Last name/ });
    this.emailInput = root.getByRole('textbox', { name: /^Email/ });
    this.notesInput = root.getByLabel(/Please share anything/);
    this.scheduleButton = root.getByRole('button', { name: 'Schedule Event' });

    // Step 4 – confirmation
    this.scheduledHeading = root.getByText('You are scheduled');
    this.invitationMessage = root.getByText(
      'A calendar invitation has been sent to your email address.'
    );

    // Email verification step (6-digit code sent to the invitee email)
    this.verifyEmailHeading = root.getByText('Verify your email');
    // Looks like 6 separate boxes, but it is ONE input with maxlength="6"
    this.codeInput = root.locator('input[name="verification_code"]');
    this.continueButton = root.getByRole('button', { name: 'Continue' });

    // Calendly anti-bot screen: "This booking cannot be completed. For security reasons..."
    this.bookingBlocked = root.getByText('This booking cannot be completed');
  }

  /**
   * Shows the first month that has free days (turns the calendar forward if needed).
   * Returns false if none of the next `maxMonths` months has a free day.
   * Needed because our own bookings can fill the current month completely.
   */
  async goToMonthWithFreeDays(maxMonths = 4) {
    await this.waitForCalendar();
    for (let month = 0; month < maxMonths; month++) {
      const found = await this.availableDays
        .first()
        .waitFor({ timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (found) return true;
      await this.nextMonthButton.click();
      await this.anyDay.first().waitFor();
    }
    return false;
  }

  async waitForCalendar() {
    await this.title.waitFor();
    await this.anyDay.first().waitFor(); // availability is loaded asynchronously
  }

  /**
   * Finds the first free slot that is not in our "already booked" list,
   * opens the details form for it and returns a readable slot name,
   * e.g. "Saturday, October 31 10:00".
   * @param {(slot: string) => boolean} isTaken
   */
  async selectFreeSlot(isTaken, maxMonths = 4) {
    await this.waitForCalendar();

    for (let month = 0; month < maxMonths; month++) {
      // free days appear a moment after the calendar itself (availability request)
      await this.availableDays.first().waitFor({ timeout: 10_000 }).catch(() => {});
      const dayCount = await this.availableDays.count();

      for (let d = 0; d < dayCount; d++) {
        const day = this.availableDays.nth(d);
        const dayName = (await day.getAttribute('aria-label')).replace(/ - Times available$/, '');
        await day.click();
        await this.timeButtons.first().waitFor();

        for (const time of await this.timeButtons.allInnerTexts()) {
          const slot = `${dayName} ${time.trim()}`;
          if (isTaken(slot)) continue;

          await this.timeButtons.filter({ hasText: time.trim() }).click();
          await this.nextButton.click();
          await this.firstNameInput.waitFor({ timeout: 20_000 });
          return slot;
        }

        // Every time on this day is already taken → back to the calendar
        if (await this.backButton.isVisible()) {
          await this.backButton.click();
          await this.title.waitFor();
        }
      }

      // No free slot this month – go to the next one
      await this.nextMonthButton.click();
      await this.anyDay.first().waitFor();
    }
    throw new Error(`No free Calendly slots found in the next ${maxMonths} months`);
  }

  async fillDetails({ firstName, lastName, email, notes }) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.emailInput.fill(email);
    if (notes) await this.notesInput.fill(notes);
  }

  async schedule() {
    await this.scheduleButton.click();
  }

  async enterVerificationCode(code) {
    await this.codeInput.fill(code);
    await this.continueButton.click();
  }
}
