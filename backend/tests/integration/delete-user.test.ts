import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { query, closePool } from '../../src/config/db.js';

/**
 * DELETE /users erases an account by phone number.
 *
 * The two things worth proving: the admin key actually gates it, and a student
 * who has paid still deletes. That second one is not obvious — payments.user_id
 * is ON DELETE RESTRICT, so a naive delete fails on exactly the accounts most
 * likely to need removing.
 */
describe('DELETE /users', () => {
  let app: FastifyInstance;
  const phones: string[] = [];
  let planId: string;

  // tests/setup.ts leaves ADMIN_API_KEY unset, which switches admin routes off
  // entirely. Set it here so there is a key to test both sides of.
  const ADMIN_KEY = 'test-admin-key';

  async function makeUser(phone: string): Promise<string> {
    phones.push(phone);
    const { rows } = await query<{ id: string }>(
      'INSERT INTO users (name, phone) VALUES ($1, $2) RETURNING id',
      ['Delete Me', phone],
    );
    return rows[0]!.id;
  }

  async function userExists(phone: string): Promise<boolean> {
    const { rows } = await query('SELECT 1 FROM users WHERE phone = $1', [phone]);
    return rows.length > 0;
  }

  beforeAll(async () => {
    (env as { adminApiKey: string }).adminApiKey = ADMIN_KEY;
    app = await buildApp();
    await app.ready();

    const plan = await query<{ id: string }>(
      `INSERT INTO plans (name, mrp_paise, price_paise, is_active)
       VALUES ('Delete Test Plan', 600000, 349900, FALSE)
       RETURNING id`,
    );
    planId = plan.rows[0]!.id;
  });

  afterAll(async () => {
    await query('DELETE FROM payments WHERE plan_id = $1', [planId]);
    await query('DELETE FROM users WHERE phone = ANY($1)', [phones]);
    await query('DELETE FROM plans WHERE id = $1', [planId]);
    await query('DELETE FROM otp_challenges WHERE phone = ANY($1)', [phones]);
    await app.close();
    await closePool();
  });

  it('deletes the account the phone number belongs to', async () => {
    const phone = '+919876500001';
    await makeUser(phone);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users',
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { phone },
    });

    expect(response.statusCode).toBe(204);
    expect(await userExists(phone)).toBe(false);
  });

  it('deletes a student who has paid, rather than failing on the payment record', async () => {
    const phone = '+919876500002';
    const userId = await makeUser(phone);
    await query(
      `INSERT INTO payments (user_id, plan_id, razorpay_order_id, amount_paise, status)
       VALUES ($1, $2, 'order_delete_test', 349900, 'paid')`,
      [userId, planId],
    );

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users',
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { phone },
    });

    expect(response.statusCode).toBe(204);
    expect(await userExists(phone)).toBe(false);
    const payments = await query('SELECT 1 FROM payments WHERE user_id = $1', [userId]);
    expect(payments.rows).toHaveLength(0);
  });

  it('takes the outstanding OTP challenges with it', async () => {
    const phone = '+919876500003';
    await makeUser(phone);
    await query(
      `INSERT INTO otp_challenges (phone, otp_hash, expires_at)
       VALUES ($1, 'hash', NOW() + INTERVAL '5 minutes')`,
      [phone],
    );

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users',
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { phone },
    });

    expect(response.statusCode).toBe(204);
    const challenges = await query('SELECT 1 FROM otp_challenges WHERE phone = $1', [phone]);
    expect(challenges.rows).toHaveLength(0);
  });

  it('is a 404 for a number nobody has registered', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users',
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { phone: '+919876599999' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('denies the route exists without the admin key, and deletes nothing', async () => {
    const phone = '+919876500004';
    await makeUser(phone);

    const noKey = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users',
      payload: { phone },
    });
    const wrongKey = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users',
      headers: { 'x-admin-key': 'not-the-key' },
      payload: { phone },
    });

    expect(noKey.statusCode).toBe(404);
    expect(wrongKey.statusCode).toBe(404);
    expect(await userExists(phone)).toBe(true);
  });

  it('rejects a number that is not a phone number before touching the database', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users',
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: { phone: 'not-a-phone' },
    });

    expect(response.statusCode).toBe(400);
  });
});
