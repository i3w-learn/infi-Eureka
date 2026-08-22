import type { FastifyInstance } from 'fastify';
import { container } from '../../container.js';
import { listLibrarySchema, openLibraryDocumentSchema } from '../../types/library-schemas.js';
import type { LibraryKind } from '../../models/library.js';

export async function libraryRoutes(app: FastifyInstance): Promise<void> {
  // The catalogue needs only a login, so an unpaid student can see everything
  // they would get. Titles are not the content (FR-P-03).
  app.get<{ Querystring: { kind: LibraryKind; subject?: string; grade?: number } }>(
    '/library',
    { schema: listLibrarySchema, onRequest: [app.requireAuth] },
    async (request) => container.libraryService.list(request.query),
  );

  // Opening one hands back the PDF link, so this is where payment is checked —
  // with the free-sample hole, same as mock tests.
  app.get<{ Params: { id: string } }>(
    '/library/:id',
    { schema: openLibraryDocumentSchema, onRequest: [app.requireDocumentAccess] },
    async (request) => container.libraryService.open(request.params.id),
  );
}
