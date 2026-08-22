import { subjectQuery, uuidParam } from './schema-common.js';

const noteSummarySchema = {
  type: 'object',
  required: ['id', 'title', 'subject', 'chapter'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    subject: { type: 'string' },
    chapter: { type: 'string' },
  },
} as const;

const highlightSchema = {
  type: 'object',
  required: ['id', 'noteId', 'highlightedText', 'startOffset', 'endOffset', 'createdAt'],
  properties: {
    id: { type: 'string' },
    noteId: { type: 'string' },
    highlightedText: { type: 'string' },
    startOffset: { type: 'integer' },
    endOffset: { type: 'integer' },
    createdAt: { type: 'string' },
  },
} as const;

export const listNotesSchema = {
  querystring: subjectQuery,
  response: {
    200: { type: 'array', items: noteSummarySchema },
  },
} as const;

export const getNoteSchema = {
  params: uuidParam,
  response: {
    200: {
      type: 'object',
      required: ['id', 'title', 'subject', 'chapter', 'contentHtml'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        subject: { type: 'string' },
        chapter: { type: 'string' },
        contentHtml: { type: 'string' },
      },
    },
  },
} as const;

export const listHighlightsSchema = {
  params: uuidParam,
  response: {
    200: { type: 'array', items: highlightSchema },
  },
} as const;

export const createHighlightSchema = {
  params: uuidParam,
  body: {
    type: 'object',
    required: ['highlightedText', 'startOffset', 'endOffset'],
    additionalProperties: false,
    properties: {
      highlightedText: { type: 'string', minLength: 1, maxLength: 5000 },
      startOffset: { type: 'integer', minimum: 0 },
      endOffset: { type: 'integer', minimum: 1 },
    },
  },
  response: {
    201: highlightSchema,
  },
} as const;

export const deleteHighlightSchema = {
  params: uuidParam,
} as const;
