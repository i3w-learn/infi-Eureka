import type { FastifyInstance } from 'fastify';
import type { MultipartValue } from '@fastify/multipart';
import { container } from '../../container.js';
import { ValidationError } from '../../exceptions/app-error.js';
import { requireAdminKey } from '../../middleware/admin-key.js';
import {
  addVideoByLinkSchema,
  getVideoSchema,
  listVideosSchema,
  streamSchema,
  streamTokenSchema,
  uploadVideoSchema,
  watchVideoSchema,
} from '../../types/video-schemas.js';
import type { AddVideoByLinkInput } from '../../services/video-service.js';

function textField(fields: Record<string, unknown>, name: string): string | undefined {
  const field = fields[name] as MultipartValue<string> | undefined;
  return field && typeof field.value === 'string' ? field.value : undefined;
}

export async function videoRoutes(app: FastifyInstance): Promise<void> {
  // The catalogue needs only a login — an unpaid student can browse what they
  // would get (FR-P-03). Watching needs payment.
  app.get<{ Querystring: { subject?: string } }>(
    '/videos',
    { schema: listVideosSchema, onRequest: [app.requireAuth] },
    async (request) => container.videoService.list(request.query.subject),
  );

  app.get<{ Params: { id: string } }>(
    '/videos/:id',
    { schema: getVideoSchema, onRequest: [app.requireAuth] },
    async (request) => container.videoService.get(request.params.id),
  );

  // "How do I play this?" — answered only for paying users. Link videos hand
  // back their URL; self-hosted ones a short-lived stream token.
  app.get<{ Params: { id: string } }>(
    '/videos/:id/watch',
    { schema: watchVideoSchema, onRequest: [app.requireVideoAccess] },
    async (request) => container.videoService.watch(request.user.sub, request.params.id),
  );

  app.get<{ Params: { id: string } }>(
    '/videos/:id/stream-token',
    { schema: streamTokenSchema, onRequest: [app.requireVideoAccess] },
    async (request) => container.videoService.issueStreamToken(request.user.sub, request.params.id),
  );

  // Authorised by the stream token in `?t=`, not a JWT header — a <video> tag
  // cannot send headers (FR-V-06). Byte ranges make seeking work (FR-V-04).
  app.get<{ Params: { id: string }; Querystring: { t: string } }>(
    '/videos/:id/stream',
    { schema: streamSchema },
    async (request, reply) => {
      const video = await container.videoService.openStream(
        request.params.id,
        request.query.t,
        request.headers.range,
      );

      void reply.header('accept-ranges', 'bytes').type(video.mimeType);
      if (video.range) {
        const { start, end } = video.range;
        return reply
          .status(206)
          .header('content-range', `bytes ${start}-${end}/${video.sizeBytes}`)
          .header('content-length', end - start + 1)
          .send(video.stream);
      }
      return reply.header('content-length', video.sizeBytes).send(video.stream);
    },
  );

  // Content ingestion below, until there is an admin panel.

  // Catalogue a video we were given a link for.
  app.post<{ Body: AddVideoByLinkInput }>(
    '/videos',
    { schema: addVideoByLinkSchema },
    async (request, reply) => {
      requireAdminKey(request);
      const video = await container.videoService.addByLink(request.body);
      return reply.status(201).send(video);
    },
  );

  app.post('/videos/upload', { schema: uploadVideoSchema }, async (request, reply) => {
    requireAdminKey(request);

    const file = await request.file();
    if (!file) throw new ValidationError('Attach the video file as multipart field "file".');

    // Text fields must precede the file part in the form, which is how every
    // HTTP client orders them by default.
    const title = textField(file.fields, 'title');
    const subject = textField(file.fields, 'subject');
    const chapter = textField(file.fields, 'chapter');
    if (!title || !subject || !chapter) {
      throw new ValidationError('Fields "title", "subject" and "chapter" are required before the file.');
    }

    const video = await container.videoService.upload({
      title,
      subject,
      chapter,
      durationSeconds: Number(textField(file.fields, 'durationSeconds') ?? '0') || 0,
      thumbnailUrl: textField(file.fields, 'thumbnailUrl'),
      mimeType: file.mimetype,
      filename: file.filename,
      file: file.file,
    });
    return reply.status(201).send(video);
  });
}
