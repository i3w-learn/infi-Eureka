import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { query, closePool } from '../../src/config/db.js';

/**
 * Proves the payment gate works the way the SRS requires: premium is read from
 * the database on every request, not from the token.
 *
 * The last test is the one that matters — the same token keeps working after
 * the user pays, with no re-login. If premium ever moves back into the JWT,
 * that test fails.
 */
describe('requirePremium guard', () => {
  let app: FastifyInstance;
  let userId: string;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();

    // A route that exists only for this test, guarded the same way real
    // premium routes will be.
    app.get('/test-only/locked', { onRequest: [app.requirePremium] }, async () => ({ ok: true }));
    await app.ready();

    const { rows } = await query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, is_premium)
       VALUES ('Guard Test', 'guard-test@example.com', 'not-a-real-hash', FALSE)
       ON CONFLICT (email) DO UPDATE SET is_premium = FALSE
       RETURNING id`,
    );
    userId = rows[0]!.id;
    token = app.jwt.sign({ sub: userId });
  });

  afterAll(async () => {
    await query('DELETE FROM users WHERE email = $1', ['guard-test@example.com']);
    await app.close();
    await closePool();
  });

  it('rejects a request with no token', async () => {
    const response = await app.inject({ method: 'GET', url: '/test-only/locked' });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a logged-in user who has not paid', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test-only/locked',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('PAYMENT_REQUIRED');
  });

  it('lets the same token through once the database says the user has paid', async () => {
    await query('UPDATE users SET is_premium = TRUE WHERE id = $1', [userId]);

    const response = await app.inject({
      method: 'GET',
      url: '/test-only/locked',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
