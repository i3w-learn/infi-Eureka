import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { env, isProduction, isTest } from './config/env.js';
import { container } from './container.js';
import authGuards from './middleware/auth.js';
import { registerErrorHandler } from './middleware/error-handler.js';
import { registerRoutes, API_PREFIX } from './api/routes/index.js';
import { registerDocs } from './api/openapi.js';

/**
 * Where the Docker image puts the built React app, next to the compiled server.
 * Absent in development and in tests — there the frontend is served by Vite on
 * :5173 and reaches the API through its proxy — so its presence is what decides
 * whether this process serves the app as well as the API.
 */
const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

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

  await app.register(authGuards, {
    userDao: container.userDao,
    testDao: container.testDao,
    attemptDao: container.attemptDao,
    libraryDao: container.libraryDao,
    videoDao: container.videoDao,
  });

  // In the deployed image the API and the React app share one origin, so the
  // built assets are served from here too. `wildcard: false` registers a route
  // only for files that exist on disk; anything else falls through to the
  // not-found handler below, which is what makes client-side routing work.
  const servesFrontend = existsSync(FRONTEND_DIR);
  let spaIndexHtml: string | undefined;
  if (servesFrontend) {
    await app.register(fastifyStatic, { root: FRONTEND_DIR, wildcard: false });
    // Read once at boot rather than per request: it is an immutable build
    // artifact, and every deep link into the app sends it.
    spaIndexHtml = await readFile(join(FRONTEND_DIR, 'index.html'), 'utf8');
  }

  // Before the routes: the spec is built from their schemas as they register.
  if (env.docsEnabled) {
    await registerDocs(app);
  }

  registerErrorHandler(app, { apiPrefix: API_PREFIX, spaIndexHtml });
  await registerRoutes(app);

  return app;
}
