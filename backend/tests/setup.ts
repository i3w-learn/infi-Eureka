import 'dotenv/config';

/**
 * Point every test at the throwaway test database.
 *
 * This runs before any test file imports `config/db.ts`, so the pool is built
 * against TEST_DATABASE_URL and a stray integration test can never truncate
 * the development database.
 */
process.env['NODE_ENV'] = 'test';

const testUrl = process.env['TEST_DATABASE_URL'];
if (testUrl) {
  process.env['DATABASE_URL'] = testUrl;
}

process.env['JWT_SECRET'] ??= 'test-secret-not-used-outside-tests';

// Deterministic gateway secrets so signature tests can compute valid HMACs.
// `||=` not `??=` on purpose — .env may define these as empty strings.
process.env['RAZORPAY_KEY_ID'] ||= 'rzp_test_fake';
process.env['RAZORPAY_KEY_SECRET'] ||= 'test-key-secret';
process.env['RAZORPAY_WEBHOOK_SECRET'] ||= 'test-webhook-secret';

// Tests hammer endpoints far faster than a human; keep limits out of the way.
process.env['AUTH_RATE_LIMIT_MAX'] = '1000';
process.env['PAYMENT_RATE_LIMIT_MAX'] = '1000';
