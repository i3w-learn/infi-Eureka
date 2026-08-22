import type { FastifyInstance } from 'fastify';
import { container } from '../../container.js';
import { env } from '../../config/env.js';
import { meSchema, registerSchema, requestOtpSchema, verifyOtpSchema } from '../../types/auth-schemas.js';
import type { RegisterInput } from '../../services/auth-service.js';

/** OTP endpoints are brute-force targets, so they get the tight limit (NFR-S-05). */
const authRateLimit = {
  rateLimit: { max: env.rateLimit.authMax, timeWindow: '1 minute' },
} as const;

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { phone: string } }>(
    '/auth/request-otp',
    { schema: requestOtpSchema, config: authRateLimit },
    async (request) => container.authService.requestOtp(request.body.phone),
  );

  app.post<{ Body: { phone: string; otp: string; challengeToken: string } }>(
    '/auth/verify-otp',
    { schema: verifyOtpSchema, config: authRateLimit },
    async (request) =>
      container.authService.verifyOtp(request.body.phone, request.body.otp, request.body.challengeToken),
  );

  app.post<{ Body: RegisterInput }>(
    '/auth/register',
    { schema: registerSchema, config: authRateLimit },
    async (request, reply) => {
      const result = await container.authService.register(request.body);
      return reply.status(201).send(result);
    },
  );

  app.get('/me', { schema: meSchema, onRequest: [app.requireAuth] }, async (request) =>
    container.authService.me(request.user.sub),
  );
}
