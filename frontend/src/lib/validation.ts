/**
 * Client-side form checks.
 *
 * These exist to give an immediate, specific answer — not to secure anything.
 * The backend validates every one of these again; a check that only runs in
 * the browser is a hint, never a guarantee.
 *
 * Messages say what to do, not what went wrong.
 */

/** Deliberately permissive: real addresses are stranger than most patterns allow. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MIN_PASSWORD_LENGTH = 8;

export function validateName(value: string): string | undefined {
  if (!value.trim()) return 'Enter your name';
  if (value.trim().length < 2) return 'Enter your full name';
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Enter your email';
  if (!EMAIL.test(value.trim())) return 'Enter a valid email, like asha@gmail.com';
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Enter a password';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return undefined;
}

/** Login only checks presence — telling someone their saved password is
 *  "too short" after a rule change is unhelpful and leaks the rule. */
export function validatePasswordPresence(value: string): string | undefined {
  return value ? undefined : 'Enter your password';
}

/** Matches the backend's PHONE_REGEX: optional +, 10–15 digits, no leading 0. */
const PHONE = /^\+?[1-9]\d{9,14}$/;

export function validatePhone(value: string): string | undefined {
  const cleaned = value.replace(/[\s-]/g, '');
  if (!cleaned) return 'Enter your mobile number';
  if (!PHONE.test(cleaned)) return 'Enter a valid mobile number, like 9876543210';
  return undefined;
}

/** Chip groups on signup: every question has to be answered. */
export function validateChoice(values: string[], message: string): string | undefined {
  return values.length ? undefined : message;
}

export function validateOtp(value: string): string | undefined {
  if (!value.trim()) return 'Enter the 4-digit code';
  if (!/^\d{4}$/.test(value.trim())) return 'The code is 4 digits';
  return undefined;
}

/** Matches the backend's DATE_REGEX (dd-mm-yyyy) plus a basic sanity check. */
export function validateDateOfBirth(value: string): string | undefined {
  if (!value.trim()) return 'Enter your date of birth';
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) return 'Use the format dd-mm-yyyy, like 04-08-2008';
  const [day, month, year] = value.split('-').map(Number);
  const thisYear = new Date().getFullYear();
  if (!day || !month || !year || month > 12 || day > 31 || year < 1950 || year > thisYear) {
    return 'That date does not look right';
  }
  return undefined;
}
