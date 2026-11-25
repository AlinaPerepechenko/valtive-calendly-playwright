import { SlotLedger } from './SlotLedger';
import { TestInbox } from './TestInbox';

// Runs once before all tests.
export default async function globalSetup() {
  // start every run with an empty list of booked slots
  SlotLedger.reset();

  // Fail fast: check the test inbox provider once, instead of 40 identical failures.
  if (TestInbox.isEnabled()) await TestInbox.preflight();
}
