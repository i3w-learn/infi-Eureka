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
  querystring: subjectQuery,
  response: {
    200: { type: 'array', items: videoSummarySchema },
  },
} as const;

export const getVideoSchema = {
  params: uuidParam,
  response: {
    200: videoSummarySchema,
  },
} as const;

export const streamTokenSchema = {
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
  response: {
    201: videoSummarySchema,
  },
} as const;

// The premium-gated "how do I play this" answer. The external URL appears
// here and nowhere else — never in the browsable catalogue.
export const watchVideoSchema = {
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
