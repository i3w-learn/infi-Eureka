import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  logLevel: optional('LOG_LEVEL', 'info'),
  port: Number(optional('PORT', '3000')),

  databaseUrl: required('DATABASE_URL'),
  /** Separate database for integration tests, wiped between runs. */
  testDatabaseUrl: optional('TEST_DATABASE_URL', ''),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),

  storage: {
    /** 'local' writes to disk; 's3' is used in production. */
    driver: optional('STORAGE_DRIVER', 'local'),
    localPath: optional('STORAGE_LOCAL_PATH', './storage'),
  },

  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),

  /** Serves the Swagger UI at /docs. Set to 'false' to hide it in a deployment. */
  docsEnabled: optional('DOCS_ENABLED', 'true') !== 'false',

  /**
   * Opens the fixed test account (see auth-service.ts) on a deployment that
   * would otherwise refuse it. Off unless explicitly set to 'true', because
   * anyone who knows the number and code then gets a free premium account.
   * Only for a demo with no real students on it.
   */
  demoLogin: optional('DEMO_LOGIN', 'false') === 'true',

  razorpay: {
    keyId: optional('RAZORPAY_KEY_ID', ''),
    keySecret: optional('RAZORPAY_KEY_SECRET', ''),
    webhookSecret: optional('RAZORPAY_WEBHOOK_SECRET', ''),
  },

  /**
   * Guards POST /videos/upload until there is a real admin panel. Empty means
   * uploads are disabled; content then goes in through seeds only.
   */
  adminApiKey: optional('ADMIN_API_KEY', ''),

  rateLimit: {
    /** Login/OTP attempts per IP per minute (NFR-S-05). */
    authMax: Number(optional('AUTH_RATE_LIMIT_MAX', '5')),
    /** Payment calls per user per minute (NFR-S-06). */
    paymentMax: Number(optional('PAYMENT_RATE_LIMIT_MAX', '10')),
  },
} as const;

export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
