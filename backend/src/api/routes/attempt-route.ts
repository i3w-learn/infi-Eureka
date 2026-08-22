import type { FastifyInstance } from 'fastify';
import { container } from '../../container.js';
import {
  attemptResultSchema,
  attemptStateResponseSchema,
  saveAnswerSchema,
  submitAttemptSchema,
} from '../../types/test-schemas.js';
import type { SaveAnswerInput } from '../../services/attempt-service.js';

export async function attemptRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>(
    '/attempts/:id',
    { schema: attemptStateResponseSchema, onRequest: [app.requirePremium] },
    async (request) => container.attemptService.state(request.user.sub, request.params.id),
  );

  app.put<{ Params: { id: string }; Body: SaveAnswerInput }>(
    '/attempts/:id/answers',
    { schema: saveAnswerSchema, onRequest: [app.requirePremium] },
    async (request) => {
      await container.attemptService.saveAnswer(request.user.sub, request.params.id, request.body);
      return { saved: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/attempts/:id/submit',
    { schema: submitAttemptSchema, onRequest: [app.requirePremium] },
    async (request) => container.attemptService.submit(request.user.sub, request.params.id),
  );

  app.get<{ Params: { id: string } }>(
    '/attempts/:id/result',
    { schema: attemptResultSchema, onRequest: [app.requirePremium] },
    async (request) => container.attemptService.result(request.user.sub, request.params.id),
  );
}
