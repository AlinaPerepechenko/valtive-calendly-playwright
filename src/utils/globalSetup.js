import { SlotLedger } from './SlotLedger';

// Runs once before all tests: start every run with an empty list of booked slots.
export default async function globalSetup() {
  SlotLedger.reset();
}
