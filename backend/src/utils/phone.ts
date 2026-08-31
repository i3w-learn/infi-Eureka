/**
 * One number, one spelling.
 *
 * A student types `9876543210` on their phone and `+91 98765 43210` on a
 * laptop, and means the same thing both times. Nothing normalised these on
 * the way in, so they became two accounts: pay on one and the other stays
 * locked, and an admin deleting "the" account deletes only half of it.
 *
 * Indian numbers settle on the bare ten digits — what students actually type,
 * and what every row already holds, so no stored number has to move. The
 * WhatsApp sender adds the country code back on its way out.
 */
export function normalisePhone(phone: string): string {
  // Leading zeros cover both the trunk prefix (09876…) and 0091.
  const digits = phone.replace(/\D/g, '').replace(/^0+/, '');

  // Twelve digits opening with 91 is an Indian number carrying its country
  // code. Numbers from elsewhere are left exactly as dialled — this app sells
  // to Indian students, so guessing at other countries' trunk rules would
  // break more numbers than it fixed.
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);

  return digits;
}
