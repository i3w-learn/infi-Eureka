import type { FastifyInstance, FastifyRequest } from 'fastify';
import { container } from '../../container.js';
import { env } from '../../config/env.js';
import { InvalidSignatureError } from '../../exceptions/app-error.js';
import { activePlanSchema, createOrderSchema, verifyPaymentSchema } from '../../types/payment-schemas.js';

/**
 * Payment calls are limited per user, not per IP — a hostel full of students
 * behind one NAT should not lock each other out (NFR-S-06). The bearer token
 * stands in for the user id; unauthenticated callers fall back to IP.
 */
const paymentRateLimit = {
  rateLimit: {
    max: env.rateLimit.paymentMax,
    timeWindow: '1 minute',
    keyGenerator: (request: FastifyRequest) => request.headers.authorization ?? request.ip,
  },
} as const;

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  app.get('/plans/active', { schema: activePlanSchema }, async () =>
    container.paymentService.activePlan(),
  );

  app.post(
    '/payments/create-order',
    { schema: createOrderSchema, onRequest: [app.requireAuth], config: paymentRateLimit },
    async (request, reply) => {
      const order = await container.paymentService.createOrder(request.user.sub);
      return reply.status(201).send(order);
    },
  );

  app.post<{ Body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string } }>(
    '/payments/verify',
    { schema: verifyPaymentSchema, onRequest: [app.requireAuth], config: paymentRateLimit },
    async (request) => container.paymentService.verify(request.user.sub, request.body),
  );

  // No JWT — Razorpay calls this. Its signature over the raw bytes is the
  // authentication (FR-P-11). Always 200 on success so Razorpay stops retrying.
  app.post('/payments/webhook', async (request) => {
    if (!request.rawBody) throw new InvalidSignatureError();
    const signature = request.headers['x-razorpay-signature'];
    const result = await container.paymentService.webhook(
      request.rawBody,
      typeof signature === 'string' ? signature : undefined,
    );
    return { received: true, handled: result.handled };
  });
}
