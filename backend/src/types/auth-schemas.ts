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
  summary: 'Step 1 of login — send a one-time code to a phone',
  description:
    'Sends a 4-digit code over WhatsApp and returns a `challengeToken`. Keep both the phone ' +
    'number and that token; step 2 needs them together. Outside production the code also ' +
    'comes back as `devOtp`, so you can finish the flow without a real WhatsApp message. ' +
    'Rate limited per IP (`AUTH_RATE_LIMIT_MAX`, default 5/minute).',
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
        // Stands in for the WhatsApp message during development; never present in production.
        devOtp: { type: 'string' },
      },
    },
  },
} as const;

export const verifyOtpSchema = {
  summary: 'Step 2 of login — exchange the code for a token',
  description:
    'Send the phone, the 4 digits, and the `challengeToken` from step 1. The `isNewUser` flag ' +
    'decides what the returned `accessToken` is: `false` means it is a full session token — ' +
    'paste it into **Authorize** and you are done. `true` means it is a short-lived ' +
    'registration token accepted only by `/auth/register`; every other route rejects it.',
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
  summary: 'Step 3 of login — create the account (new users only)',
  description:
    'Only for `isNewUser: true`. Put the registration token from step 2 in the `accessToken` ' +
    'body field (not the header), with `dateOfBirth` as `DD-MM-YYYY`. Everything else is ' +
    'optional onboarding detail. Returns the real session token plus the created user.',
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

export const deleteUserSchema = {
  summary: 'Erase an account by phone number (admin)',
  description:
    'Deletes the account and everything attached to it — highlights, mock-test attempts and ' +
    'payment records — and returns 204. There is no undo and no soft delete. ' +
    'Send `ADMIN_API_KEY` in the `x-admin-key` header; when that variable is unset on the ' +
    'server this route answers 404, as if it did not exist. ' +
    'The number must match what was stored exactly, digits and any `+91` included. ' +
    'It goes in the body rather than the path so it stays out of URLs and access logs.',
  security: [{ adminKey: [] }],
  body: {
    type: 'object',
    required: ['phone'],
    additionalProperties: false,
    properties: {
      phone: { type: 'string', pattern: PHONE_PATTERN },
    },
  },
} as const;

export const meSchema = {
  summary: 'The signed-in user',
  description:
    'Profile for whoever the bearer token belongs to. Also the cheapest way to check two ' +
    'things: that a token is still valid (401 if not), and whether the student has paid — ' +
    '`isPremium` is what gates videos, notes, the PDF library and mock tests.',
  response: {
    200: publicUserSchema,
  },
} as const;
