export const activePlanSchema = {
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
