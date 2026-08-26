import { uuidParam } from './schema-common.js';

const summaryProperties = {
  id: { type: 'string' },
  slug: { type: 'string' },
  title: { type: 'string' },
  subject: { type: 'string' },
  grade: { type: 'integer' },
  chapterNumber: { type: ['integer', 'null'] },
  sizeBytes: { type: 'integer' },
  isFreeSample: { type: 'boolean' },
} as const;

const summaryRequired = [
  'id', 'slug', 'title', 'subject', 'grade', 'chapterNumber', 'sizeBytes', 'isFreeSample',
] as const;

/**
 * The catalogue shape. There is deliberately no `url` property: the response
 * schema strips anything not listed, so the PDF link cannot leak into a
 * browsable list even if a future query started selecting it.
 */
const documentSummarySchema = {
  type: 'object',
  required: [...summaryRequired],
  additionalProperties: false,
  properties: summaryProperties,
} as const;

const documentDetailSchema = {
  type: 'object',
  required: [...summaryRequired, 'url'],
  additionalProperties: false,
  properties: { ...summaryProperties, url: { type: 'string' } },
} as const;

export const listLibrarySchema = {
  summary: 'Browse the PDF library',
  description:
    'Formula sheets and NCERT highlight chapters. `kind` is required; `subject` and `grade` narrow it ' +
    'further. Any signed-in student sees the catalogue, but no download link appears here — that ' +
    'comes from opening one.',
  querystring: {
    type: 'object',
    required: ['kind'],
    additionalProperties: false,
    properties: {
      kind: { type: 'string', enum: ['formula_sheet', 'ncert_highlight'] },
      subject: { type: 'string', enum: ['physics', 'chemistry', 'biology'] },
      grade: { type: 'integer', enum: [11, 12] },
    },
  },
  response: {
    200: { type: 'array', items: documentSummarySchema },
  },
} as const;

export const openLibraryDocumentSchema = {
  summary: 'Open one PDF',
  description:
    'Returns the same entry plus the `url` to the file. This is where payment is checked, with one ' +
    'hole: documents flagged `isFreeSample` open for any signed-in student.',
  params: uuidParam,
  response: {
    200: documentDetailSchema,
  },
} as const;
