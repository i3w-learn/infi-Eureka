import { subjectQuery, uuidParam } from './schema-common.js';

const videoSummarySchema = {
  type: 'object',
  required: [
    'id',
    'title',
    'subject',
    'chapter',
    'thumbnailUrl',
    'durationSeconds',
    'sourceKind',
    'grade',
    'educatorName',
    'isFreeSample',
  ],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    subject: { type: 'string' },
    chapter: { type: 'string' },
    thumbnailUrl: { type: ['string', 'null'] },
    durationSeconds: { type: 'integer' },
    sourceKind: { type: 'string', enum: ['youtube', 'link', 'file'] },
    grade: { type: ['integer', 'null'] },
    educatorName: { type: ['string', 'null'] },
    isFreeSample: { type: 'boolean' },
  },
} as const;

export const listVideosSchema = {
  summary: 'Browse the lecture catalogue',
  description:
    'Any signed-in student sees every lecture here, paid or not — titles are not the content. ' +
    'Optional `?subject=` filter. Nothing playable comes back; ask `/videos/{id}/watch` for that.',
  querystring: subjectQuery,
  response: {
    200: { type: 'array', items: videoSummarySchema },
  },
} as const;

export const getVideoSchema = {
  summary: 'One lecture catalogue entry',
  description: 'Same fields as the list, for a single id. Still no playable URL.',
  params: uuidParam,
  response: {
    200: videoSummarySchema,
  },
} as const;

export const streamTokenSchema = {
  summary: 'Mint a fresh stream token',
  description:
    'Only for self-hosted (`sourceKind: file`) lectures. `/watch` already returns one; call ' +
    'this when a long session outlives it and the `<video>` element needs a new URL.',
  params: uuidParam,
  response: {
    200: {
      type: 'object',
      required: ['token', 'expiresIn'],
      properties: {
        token: { type: 'string' },
        expiresIn: { type: 'integer' },
      },
    },
  },
} as const;

// No response schema: the stream endpoint sends raw bytes, not JSON.
export const streamSchema = {
  summary: 'The video bytes',
  description:
    'Point a `<video src>` at this URL. Authorised by the `t` query token rather than a ' +
    'header, because a `<video>` tag cannot send one — that is why premium is checked when ' +
    'the token is issued, not here. Honours `Range`, replying 206 so seeking works.',
  params: uuidParam,
  querystring: {
    type: 'object',
    required: ['t'],
    additionalProperties: false,
    properties: {
      t: { type: 'string', minLength: 1 },
    },
  },
} as const;

export const uploadVideoSchema = {
  summary: 'Upload a lecture video (admin)',
  description:
    'multipart/form-data. Send the text fields `title`, `subject`, `chapter` and optionally ' +
    '`durationSeconds`, `thumbnailUrl` *before* the `file` part.',
  security: [{ adminKey: [] }],
  consumes: ['multipart/form-data'],
  response: {
    201: videoSummarySchema,
  },
} as const;

// The premium-gated "how do I play this" answer. The external URL appears
// here and nowhere else — never in the browsable catalogue.
export const watchVideoSchema = {
  summary: 'How to play this lecture',
  description:
    'The premium gate for video, with a hole for the one lecture flagged `isFreeSample`. ' +
    '`kind` tells the player what to do: `youtube` hands back `videoId`/`embedUrl` for an ' +
    'iframe, `link` an `url` to open, and `stream` a short-lived `token` to put in the `t` ' +
    'query of `/videos/{id}/stream`. The external URL of a lecture appears here and nowhere ' +
    'else — never in the browsable catalogue.',
  params: uuidParam,
  response: {
    200: {
      type: 'object',
      required: ['kind'],
      properties: {
        kind: { type: 'string', enum: ['youtube', 'link', 'stream'] },
        // youtube
        videoId: { type: 'string' },
        embedUrl: { type: 'string' },
        // link
        url: { type: 'string' },
        // stream
        token: { type: 'string' },
        expiresIn: { type: 'integer' },
      },
    },
  },
} as const;

export const addVideoByLinkSchema = {
  summary: 'Catalogue a video from an external link (admin)',
  description:
    'Adds a YouTube or direct-link lecture to the catalogue without uploading anything. ' +
    'Send `ADMIN_API_KEY` in the `x-admin-key` header; when that variable is unset on the ' +
    'server this route answers 404, as if it did not exist.',
  security: [{ adminKey: [] }],
  body: {
    type: 'object',
    required: ['title', 'subject', 'chapter', 'externalUrl'],
    additionalProperties: false,
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 300 },
      subject: { type: 'string', minLength: 1, maxLength: 100 },
      chapter: { type: 'string', minLength: 1, maxLength: 200 },
      externalUrl: { type: 'string', minLength: 8, maxLength: 2000, pattern: '^https?://' },
      durationSeconds: { type: 'integer', minimum: 0 },
      thumbnailUrl: { type: 'string', maxLength: 2000, pattern: '^https?://' },
    },
  },
  response: {
    201: videoSummarySchema,
  },
} as const;
