import type { FastifyInstance } from 'fastify';
import { container } from '../../container.js';
import { getTestSchema, listTestsSchema, startAttemptSchema } from '../../types/test-schemas.js';

export async function testRoutes(app: FastifyInstance): Promise<void> {
  app.get('/tests', { schema: listTestsSchema, onRequest: [app.requireAuth] }, async () =>
    container.testService.list(),
  );

  app.get<{ Params: { id: string } }>(
    '/tests/:id',
    { schema: getTestSchema, onRequest: [app.requireTestAccess] },
    async (request) => container.testService.get(request.params.id),
  );

  // Start — or resume: while an attempt is live, starting again returns it.
  app.post<{ Params: { id: string } }>(
    '/tests/:id/attempts',
    { schema: startAttemptSchema, onRequest: [app.requireTestAccess] },
    async (request, reply) => {
      const state = await container.attemptService.start(request.user.sub, request.params.id);
      return reply.status(201).send(state);
    },
  );
}
