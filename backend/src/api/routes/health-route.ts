import type { FastifyInstance } from 'fastify';
import { container } from '../../container.js';

/**
 * Reference example of a route file: it declares the HTTP contract (schema),
 * calls one service method, and returns. No logic, no SQL.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        summary: 'Liveness check',
        description:
          'Open to everyone. `status` is `ok` only when the API can also reach Postgres; a ' +
          'database it cannot reach makes this `degraded` while still answering 200, so a ' +
          'platform health probe does not kill a server that is merely waiting on the database.',
        response: {
          200: {
            type: 'object',
            required: ['status', 'database', 'uptimeSeconds'],
            properties: {
              status: { type: 'string', enum: ['ok', 'degraded'] },
              database: { type: 'string', enum: ['ok', 'error'] },
              uptimeSeconds: { type: 'number' },
            },
          },
        },
      },
    },
    async () => container.healthService.check(),
  );
}
