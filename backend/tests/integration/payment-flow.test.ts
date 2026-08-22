import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { query, queryOne, closePool } from '../../src/config/db.js';
import { env } from '../../src/config/env.js';

/**
 * Verify and webhook over real HTTP against the real test database. Orders are
 * inserted directly (creating one for real would call Razorpay's servers);
 * everything from the signature check onward is the production code path.
 */
describe('payment verification and webhook', () => {
  let app: FastifyInstance;
  let userId: string;
  let token: string;
  let planId: string;
  let orderCounter = 0;
  let orderId: string;

  function checkoutSignature(order: string, paymentId: string, secret = env.razorpay.keySecret): string {
    return createHmac('sha256', secret).update(`${order}|${paymentId}`).digest('hex');
  }

  async function premiumFlag(): Promise<boolean> {
    const row = await queryOne<{ is_premium: boolean }>('SELECT is_premium FROM users WHERE id = $1', [userId]);
    return row!.is_premium;
  }

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const user = await query<{ id: string }>(
      `INSERT INTO users (name, phone, is_premium) VALUES ('Paying Student', '+919876540000', FALSE) RETURNING id`,
    );
    userId = user.rows[0]!.id;
    token = app.jwt.sign({ sub: userId });

    const plan = await query<{ id: string }>(
      `INSERT INTO plans (name, mrp_paise, price_paise, is_active) VALUES ('Test Plan', 600000, 349900, FALSE) RETURNING id`,
    );
    planId = plan.rows[0]!.id;
  });

  beforeEach(async () => {
    await query('UPDATE users SET is_premium = FALSE WHERE id = $1', [userId]);
    orderId = `order_test_${++orderCounter}`;
    await query(
      `INSERT INTO payments (user_id, plan_id, razorpay_order_id, amount_paise) VALUES ($1, $2, $3, 349900)`,
      [userId, planId, orderId],
    );
  });

  afterAll(async () => {
    await query('DELETE FROM payments WHERE user_id = $1', [userId]);
    await query('DELETE FROM plans WHERE id = $1', [planId]);
    await query('DELETE FROM users WHERE id = $1', [userId]);
    await app.close();
    await closePool();
  });

  it('a valid signature unlocks the user with no re-login (FR-P-02/08/09)', async () => {
    const auth = { authorization: `Bearer ${token}` };

    // Locked before paying.
    const before = await app.inject({ method: 'GET', url: '/api/v1/notes', headers: auth });
    expect(before.statusCode).toBe(200); // the catalogue is browsable...
    const gated = await app.inject({
      method: 'GET',
      url: `/api/v1/tests/00000000-0000-4000-8000-00000000dead`,
      headers: auth,
    });
    expect(gated.statusCode).toBe(403); // ...but content is not

    const verify = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: auth,
      payload: {
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_test_1',
        razorpaySignature: checkoutSignature(orderId, 'pay_test_1'),
      },
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json().isPremium).toBe(true);
    expect(await premiumFlag()).toBe(true);

    // The SAME token now passes the premium gate — no re-login (FR-P-02).
    const after = await app.inject({
      method: 'GET',
      url: `/api/v1/tests/00000000-0000-4000-8000-00000000dead`,
      headers: auth,
    });
    expect(after.statusCode).toBe(404); // through the gate, test simply doesn't exist
  });

  it('a tampered signature is rejected and the payment stays created (FR-P-08)', async () => {
    const verify = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_test_1',
        razorpaySignature: checkoutSignature(orderId, 'pay_test_1', 'wrong-secret'),
      },
    });
    expect(verify.statusCode).toBe(400);
    expect(verify.json().error.code).toBe('INVALID_SIGNATURE');

    const payment = await queryOne<{ status: string }>(
      'SELECT status FROM payments WHERE razorpay_order_id = $1',
      [orderId],
    );
    expect(payment!.status).toBe('created');
    expect(await premiumFlag()).toBe(false);
  });

  it('a signed webhook alone unlocks the user (FR-P-10/11)', async () => {
    const body = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_2', order_id: orderId } } },
    });
    const signature = createHmac('sha256', env.razorpay.webhookSecret).update(body).digest('hex');

    const webhook = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': signature },
      payload: body,
    });
    expect(webhook.statusCode).toBe(200);
    expect(webhook.json().handled).toBe(true);
    expect(await premiumFlag()).toBe(true);

    // An unsigned webhook changes nothing (FR-P-11).
    const unsigned = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      headers: { 'content-type': 'application/json' },
      payload: body,
    });
    expect(unsigned.statusCode).toBe(400);
  });

  it('verify and webhook in both orders, repeatedly, credit exactly once (FR-P-12)', async () => {
    const auth = { authorization: `Bearer ${token}` };
    const verifyPayload = {
      razorpayOrderId: orderId,
      razorpayPaymentId: 'pay_test_3',
      razorpaySignature: checkoutSignature(orderId, 'pay_test_3'),
    };
    const webhookBody = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_3', order_id: orderId } } },
    });
    const webhookSignature = createHmac('sha256', env.razorpay.webhookSecret).update(webhookBody).digest('hex');
    const webhookHeaders = { 'content-type': 'application/json', 'x-razorpay-signature': webhookSignature };

    for (const fire of [
      () => app.inject({ method: 'POST', url: '/api/v1/payments/verify', headers: auth, payload: verifyPayload }),
      () => app.inject({ method: 'POST', url: '/api/v1/payments/webhook', headers: webhookHeaders, payload: webhookBody }),
      () => app.inject({ method: 'POST', url: '/api/v1/payments/verify', headers: auth, payload: verifyPayload }),
      () => app.inject({ method: 'POST', url: '/api/v1/payments/webhook', headers: webhookHeaders, payload: webhookBody }),
    ]) {
      const response = await fire();
      expect(response.statusCode).toBe(200);
    }

    const paid = await query('SELECT * FROM payments WHERE razorpay_order_id = $1 AND status = $2', [
      orderId,
      'paid',
    ]);
    expect(paid.rowCount).toBe(1);
    expect(await premiumFlag()).toBe(true);
  });
});
