import type { FastifyInstance } from 'fastify';
import { container } from '../../container.js';
import {
  createHighlightSchema,
  deleteHighlightSchema,
  getNoteSchema,
  listHighlightsSchema,
  listNotesSchema,
} from '../../types/note-schemas.js';
import type { NewHighlight } from '../../services/note-service.js';

export async function noteRoutes(app: FastifyInstance): Promise<void> {
  // Titles are browsable with a login; the note body needs payment (FR-P-03).
  app.get<{ Querystring: { subject?: string } }>(
    '/notes',
    { schema: listNotesSchema, onRequest: [app.requireAuth] },
    async (request) => container.noteService.list(request.query.subject),
  );

  app.get<{ Params: { id: string } }>(
    '/notes/:id',
    { schema: getNoteSchema, onRequest: [app.requirePremium] },
    async (request) => container.noteService.get(request.params.id),
  );

  app.get<{ Params: { id: string } }>(
    '/notes/:id/highlights',
    { schema: listHighlightsSchema, onRequest: [app.requirePremium] },
    async (request) => container.noteService.listHighlights(request.user.sub, request.params.id),
  );

  app.post<{ Params: { id: string }; Body: NewHighlight }>(
    '/notes/:id/highlights',
    { schema: createHighlightSchema, onRequest: [app.requirePremium] },
    async (request, reply) => {
      const highlight = await container.noteService.createHighlight(
        request.user.sub,
        request.params.id,
        request.body,
      );
      return reply.status(201).send(highlight);
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/highlights/:id',
    { schema: deleteHighlightSchema, onRequest: [app.requirePremium] },
    async (request, reply) => {
      await container.noteService.deleteHighlight(request.user.sub, request.params.id);
      return reply.status(204).send();
    },
  );
}
