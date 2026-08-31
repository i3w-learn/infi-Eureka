import { describe, expect, it } from 'vitest';
import { normalisePhone } from '../../src/utils/phone.js';

/**
 * Every spelling of one Indian number has to land on the same string, because
 * that string is the account. Two spellings meant two accounts: pay on one and
 * the other stayed locked.
 */
describe('normalisePhone', () => {
  const CANONICAL = '9045838060';

  it.each([
    ['bare ten digits', '9045838060'],
    ['country code with plus', '+919045838060'],
    ['country code without plus', '919045838060'],
    ['spaces and a dash', '+91 90458-38060'],
    ['leading trunk zero', '09045838060'],
    ['international dialling prefix', '00919045838060'],
    ['grouped digits, as pasted from a contact card', '+91 90458 38060'],
  ])('reads %s as the same account', (_label, written) => {
    expect(normalisePhone(written)).toBe(CANONICAL);
  });

  it('leaves an already-canonical number untouched', () => {
    expect(normalisePhone(CANONICAL)).toBe(CANONICAL);
  });

  it('is stable when applied twice', () => {
    expect(normalisePhone(normalisePhone('+91 90458-38060'))).toBe(CANONICAL);
  });

  it('keeps different numbers apart', () => {
    expect(normalisePhone('+919045838060')).not.toBe(normalisePhone('+919045838061'));
  });

  // Guessing at other countries' trunk rules would break more numbers than it
  // fixed, so a foreign number keeps every digit it was dialled with.
  it('leaves a non-Indian number as dialled', () => {
    expect(normalisePhone('+1 415 555 0123')).toBe('14155550123');
  });
});
