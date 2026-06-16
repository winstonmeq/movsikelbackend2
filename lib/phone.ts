/**
 * Normalizes a Philippine mobile number to the canonical local form
 * "09XXXXXXXXX" so the apps and backend always store/look up the same string.
 * Mirrors PhoneUtils in the Flutter passenger/driver apps.
 */
export function normalizePhone(value: unknown): string {
  let digits = String(value ?? '').replace(/[\s\-()]/g, '').trim();

  if (digits.startsWith('+63')) {
    digits = '0' + digits.slice(3);
  } else if (digits.startsWith('63') && digits.length === 12) {
    digits = '0' + digits.slice(2);
  } else if (digits.startsWith('9') && digits.length === 10) {
    digits = '0' + digits;
  }
  return digits;
}

/** A valid PH mobile number in canonical form: 11 digits starting with 09. */
export function isValidPhone(value: unknown): boolean {
  return /^09\d{9}$/.test(normalizePhone(value));
}
