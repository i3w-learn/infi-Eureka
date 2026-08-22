/** Request/response contracts for the phone + OTP auth flow. */

const PHONE_PATTERN = '^\\+?[1-9][0-9]{9,14}$';
const DATE_PATTERN = '^[0-9]{2}-[0-9]{2}-[0-9]{4}$';

const publicUserSchema = {
  type: 'object',
  required: ['id', 'name', 'phone', 'email', 'isPremium', 'createdAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    phone: { type: 'string' },
    email: { type: 'string' },
    isPremium: { type: 'boolean' },
    createdAt: { type: 'string' },
  },
} as const;

export const requestOtpSchema = {
  body: {
    type: 'object',
    required: ['phone'],
    additionalProperties: false,
    properties: {
      phone: { type: 'string', pattern: PHONE_PATTERN },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['message', 'challengeToken', 'expiresIn'],
      properties: {
        message: { type: 'string' },
        challengeToken: { type: 'string' },
        expiresIn: { type: 'integer' },
        // Stands in for the SMS during development; never present in production.
        devOtp: { type: 'string' },
      },
    },
  },
} as const;

export const verifyOtpSchema = {
  body: {
    type: 'object',
    required: ['phone', 'otp', 'challengeToken'],
    additionalProperties: false,
    properties: {
      phone: { type: 'string', pattern: PHONE_PATTERN },
      otp: { type: 'string', pattern: '^[0-9]{4}$' },
      challengeToken: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['isNewUser', 'accessToken'],
      properties: {
        isNewUser: { type: 'boolean' },
        accessToken: { type: 'string' },
      },
    },
  },
} as const;

export const registerSchema = {
  body: {
    type: 'object',
    required: ['phone', 'dateOfBirth', 'accessToken'],
    additionalProperties: false,
    properties: {
      phone: { type: 'string', pattern: PHONE_PATTERN },
      dateOfBirth: { type: 'string', pattern: DATE_PATTERN },
      accessToken: { type: 'string', minLength: 1 },
      username: { type: 'string', maxLength: 100 },
      class: { type: 'string', maxLength: 50 },
      subjects: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 20 },
      goals: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 20 },
      learningPreference: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 20 },
    },
  },
  response: {
    201: {
      type: 'object',
      required: ['accessToken', 'user'],
      properties: {
        accessToken: { type: 'string' },
        user: publicUserSchema,
      },
    },
  },
} as const;

export const meSchema = {
  response: {
    200: publicUserSchema,
  },
} as const;
