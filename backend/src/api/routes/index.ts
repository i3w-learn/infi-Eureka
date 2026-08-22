import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health-route.js';
import { authRoutes } from './auth-route.js';
import { paymentRoutes } from './payment-route.js';
import { videoRoutes } from './video-route.js';
import { noteRoutes } from './note-route.js';
import { testRoutes } from './test-route.js';
import { attemptRoutes } from './attempt-route.js';
import { libraryRoutes } from './library-route.js';

/** Every endpoint is versioned under this prefix (SRS §5). */
export const API_PREFIX = '/api/v1';

/**
 * Every route group is registered here.
 *
 * Adding a feature means adding one line — existing files stay untouched.
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes, { prefix: API_PREFIX });
  await app.register(authRoutes, { prefix: API_PREFIX });
  await app.register(paymentRoutes, { prefix: API_PREFIX });
  await app.register(videoRoutes, { prefix: API_PREFIX });
  await app.register(noteRoutes, { prefix: API_PREFIX });
  await app.register(testRoutes, { prefix: API_PREFIX });
  await app.register(attemptRoutes, { prefix: API_PREFIX });
  await app.register(libraryRoutes, { prefix: API_PREFIX });
}
