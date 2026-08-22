import { createHmac, timingSafeEqual } from 'node:crypto';

function safeEqualHex(expected: string, given: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(given, 'utf8');
  // timingSafeEqual throws on length mismatch, so check first — the length of
  // a valid signature is public knowledge, not a secret.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Checkout signature (FR-P-08): Razorpay signs `order_id|payment_id` with the
 * key secret. The browser hands the signature back; only the server can check it.
 */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

/**
 * Webhook signature (FR-P-11): HMAC of the EXACT raw request bytes with the
 * webhook secret. This is why the webhook route keeps its unparsed body.
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string, webhookSecret: string): boolean {
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
