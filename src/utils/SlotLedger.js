import fs from 'fs';
import path from 'path';

const FILE = path.resolve('.booked-slots.json');

/**
 * Keeps the list of slots booked during the current run in a small JSON file.
 * A file (not a variable) is used because Playwright restarts the worker
 * process after a failed test, and in-memory data would be lost.
 */
export class SlotLedger {
  static reset() {
    fs.writeFileSync(FILE, '[]');
  }

  static all() {
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  }

  static has(slot) {
    return SlotLedger.all().includes(slot);
  }

  static add(slot) {
    const slots = SlotLedger.all();
    slots.push(slot);
    fs.writeFileSync(FILE, JSON.stringify(slots, null, 2));
  }
}
