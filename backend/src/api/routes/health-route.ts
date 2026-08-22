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
