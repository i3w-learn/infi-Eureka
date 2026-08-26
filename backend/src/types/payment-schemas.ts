export const activePlanSchema = {
  summary: 'The plan currently on sale',
  description:
    'Open to everyone — the pricing card is shown before login. Amounts are in paise, so ' +
    '`pricePaise: 99900` is Rs 999. `mrpPaise` is the struck-through price.',
  response: {
    200: {
      type: 'object',
      required: ['id', 'name', 'mrpPaise', 'pricePaise', 'currency'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        mrpPaise: { type: 'integer' },
        pricePaise: { type: 'integer' },
        currency: { type: 'string' },
      },
    },
  },
} as const;

// No request body: the server decides the amount from the plans table
// (FR-P-05). A client that sends fields anyway gets a 400 from
// additionalProperties, which is the "ignored" the SRS asks for — loudly.
export const createOrderSchema = {
  summary: 'Open a Razorpay order for the active plan',
  description:
    'Step 1 of paying. Send no body: the server reads the amount from the plans table so a ' +
    'client cannot name its own price (any field you send is a 400). Hand the returned ' +
    '`razorpayOrderId` and `razorpayKeyId` to Razorpay Checkout in the browser, then post ' +
    'what Checkout gives back to `/payments/verify`. Rate limited per user, 10/minute.',
  body: {
    type: ['object', 'null'],
    additionalProperties: false,
    properties: {},
  },
  response: {
    201: {
      type: 'object',
      required: ['razorpayOrderId', 'amountPaise', 'currency', 'razorpayKeyId', 'planName'],
      properties: {
        razorpayOrderId: { type: 'string' },
        amountPaise: { type: 'integer' },
        currency: { type: 'string' },
        razorpayKeyId: { type: 'string' },
        planName: { type: 'string' },
      },
    },
  },
} as const;

export const verifyPaymentSchema = {
  summary: 'Confirm a Razorpay payment and unlock premium',
  description:
    'Step 2 of paying. Send the three values Razorpay Checkout hands back on success. The ' +
    'server re-computes the signature before trusting any of it. On success the account turns ' +
    'premium straight away — no logout needed, the guards re-read payment status per request.',
  body: {
    type: 'object',
    required: ['razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'],
    additionalProperties: false,
    properties: {
      razorpayOrderId: { type: 'string', minLength: 1, maxLength: 100 },
      razorpayPaymentId: { type: 'string', minLength: 1, maxLength: 100 },
      razorpaySignature: { type: 'string', minLength: 1, maxLength: 200 },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['isPremium'],
      properties: { isPremium: { type: 'boolean' } },
    },
  },
} as const;

// Razorpay is the caller, so there is no request schema to validate against —
// the raw bytes must survive untouched for the signature check.
export const paymentWebhookSchema = {
  summary: 'Razorpay payment webhook (server-to-server)',
  description:
    'Not for clients. Razorpay POSTs here, and its `x-razorpay-signature` over the exact bytes ' +
    'sent is the authentication — there is no bearer token. It is the safety net behind ' +
    '`/payments/verify`: if the student closes the tab before verifying, this still unlocks ' +
    'their account. Answers 200 on anything it accepts so Razorpay stops retrying.',
  response: {
    200: {
      type: 'object',
      required: ['received', 'handled'],
      properties: {
        received: { type: 'boolean' },
        /** False when the event was valid but not one we act on. */
        handled: { type: 'boolean' },
      },
    },
  },
} as const;
