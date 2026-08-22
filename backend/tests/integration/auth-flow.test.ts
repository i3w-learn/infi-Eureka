import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { query, closePool } from '../../src/config/db.js';

const PHONE = '+919876500001';

/**
 * The whole signup journey over real HTTP against the real test database:
 * request an OTP, verify it, register, and read /me back.
 */
describe('phone + OTP auth flow', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await query('DELETE FROM users WHERE phone = $1', [PHONE]);
    await query('DELETE FROM otp_challenges WHERE phone = $1', [PHONE]);
  });

  afterAll(async () => {
    await query('DELETE FROM users WHERE phone = $1', [PHONE]);
    await query('DELETE FROM otp_challenges WHERE phone = $1', [PHONE]);
    await app.close();
    await closePool();
  });

  it('signs a new user up end to end', async () => {
    const otpResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/request-otp',
      payload: { phone: PHONE },
    });
    expect(otpResponse.statusCode).toBe(200);
    const { challengeToken, devOtp } = otpResponse.json();
    expect(devOtp).toMatch(/^\d{4}$/); // present outside production only

    const wrongOtp = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: { phone: PHONE, otp: devOtp === '0000' ? '1111' : '0000', challengeToken },
    });
    expect(wrongOtp.statusCode).toBe(401);

    // A code is single-use even on failure paths only after success/limits;
    // the same challenge still accepts the right code.
    const verifyResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: { phone: PHONE, otp: devOtp, challengeToken },
    });
    expect(verifyResponse.statusCode).toBe(200);
    const verified = verifyResponse.json();
    expect(verified.isNewUser).toBe(true);

    // The registration token is NOT a session (FR-A-09 spirit).
    const rejected = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${verified.accessToken}` },
    });
    expect(rejected.statusCode).toBe(401);

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        phone: PHONE,
        dateOfBirth: '15-08-2008',
        accessToken: verified.accessToken,
        username: 'Asha',
        subjects: ['biology', 'physics'],
      },
    });
    expect(registerResponse.statusCode).toBe(201);
    const registered = registerResponse.json();
    expect(registered.user.name).toBe('Asha');
    expect(registered.user.isPremium).toBe(false);

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${registered.accessToken}` },
    });
    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json().phone).toBe(PHONE);
  });

  it('logs an existing user straight in on the next OTP', async () => {
    const otpResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/request-otp',
      payload: { phone: PHONE },
    });
    const { challengeToken, devOtp } = otpResponse.json();

    const verifyResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-otp',
      payload: { phone: PHONE, otp: devOtp, challengeToken },
    });
    const verified = verifyResponse.json();
    expect(verified.isNewUser).toBe(false);

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${verified.accessToken}` },
    });
    expect(meResponse.statusCode).toBe(200);
  });
});
