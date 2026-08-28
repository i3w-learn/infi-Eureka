import type { FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { NotFoundError } from '../exceptions/app-error.js';

/**
 * The stand-in for an admin panel: a shared secret in `ADMIN_API_KEY`, sent as
 * the `x-admin-key` header.
 *
 * Failure is a 404, not a 401 or 403. An admin route that answers "wrong key"
 * has told an anonymous caller that the route exists and is worth attacking;
 * denying it exists gives nothing away. Leaving `ADMIN_API_KEY` unset switches
 * every admin route off, which is what a deployment without one should get.
 *
 * Called at the top of the handler body rather than as an `onRequest` hook, so
 * body parsing and validation still run first and the route keeps one plain
 * handler to read.
 */
export function requireAdminKey(request: FastifyRequest): void {
  if (env.adminApiKey === '' || request.headers['x-admin-key'] !== env.adminApiKey) {
    throw new NotFoundError(`Route ${request.method} ${request.url} does not exist`);
  }
}
