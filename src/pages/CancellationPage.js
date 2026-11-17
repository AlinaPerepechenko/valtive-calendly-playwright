/**
 * Page Object: Calendly cancellation page – https://calendly.com/cancellations/<uuid>
 * The link comes from the invitation email.
 */
export class CancellationPage {
  constructor(page) {
    this.page = page;
    this.reasonInput = page.getByRole('textbox').first();
    this.cancelButton = page.getByRole('button', { name: /Cancel Event/i });
    this.confirmation = page.getByText(/Cancellation Confirmed|has been cancel(l)?ed/i).first();
  }

  async cancel(url, reason = 'Automated test booking – cleanup') {
    await this.page.goto(url);
    if (await this.reasonInput.isVisible().catch(() => false)) {
      await this.reasonInput.fill(reason);
    }
    await this.cancelButton.click();
    await this.confirmation.waitFor({ timeout: 30_000 });
  }
}
