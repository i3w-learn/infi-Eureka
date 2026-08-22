import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env, isProduction, isTest } from './config/env.js';
import { container } from './container.js';
import authGuards from './middleware/auth.js';
import { registerErrorHandler } from './middleware/error-handler.js';
import { registerRoutes, API_PREFIX } from './api/routes/index.js';

/**
 * Builds the server without starting it, so tests can create an instance,
 * make requests against it in memory, and throw it away.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: isTest
      ? false
      : isProduction
        ? { level: env.logLevel }
        : {
            level: env.logLevel,
            transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
          },
    bodyLimit: 1_048_576, // 1 MB for JSON; video uploads go through multipart below
  });

  await app.register(cors, {
    origin: env.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Default ceiling. Auth and payment routes tighten this per-route (NFR-S-05/06).
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => ({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment.' },
    }),
  });

  await app.register(jwt, {
    secret: env.jwtSecret,
    sign: { expiresIn: env.jwtExpiresIn },
  });

  await app.register(multipart, {
    limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB — one-shot lecture videos are large
  });

  // Razorpay signs the exact bytes it sent, so the webhook route needs the raw
  // body. Parsing to JSON first and re-stringifying changes those bytes and the
  // signature check then fails for legitimate payments.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (request, body: Buffer, done) => {
      if (request.url === `${API_PREFIX}/payments/webhook`) {
        request.rawBody = body;
      }
      try {
        done(null, body.length ? JSON.parse(body.toString('utf8')) : {});
      } catch {
        done(null, {});
      }
    },
  );

  await app.register(authGuards, { userDao: container.userDao });

  registerErrorHandler(app);
  await registerRoutes(app);

  return app;
}
