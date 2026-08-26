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
  summary: 'Browse study-note titles',
  description: 'Any signed-in student, paid or not. Optional `?subject=` filter. Bodies need premium.',
  querystring: subjectQuery,
  response: {
    200: { type: 'array', items: noteSummarySchema },
  },
} as const;

export const getNoteSchema = {
  summary: 'Read one note',
  description:
    'The full note body as sanitised HTML. Premium only — this is the content the paywall ' +
    'protects. Render `contentHtml` as-is; offsets used by highlights are into that string.',
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
  summary: "A student's highlights on one note",
  description:
    "Only the caller's own highlights come back, never another student's. Replay them over " +
    'the rendered note using `startOffset`/`endOffset`.',
  params: uuidParam,
  response: {
    200: { type: 'array', items: highlightSchema },
  },
} as const;

export const createHighlightSchema = {
  summary: 'Save a highlight on a note',
  description:
    "`startOffset`/`endOffset` are character positions into that note's `contentHtml`, and " +
    '`highlightedText` is what sat between them — stored so a highlight still renders if the ' +
    'note is later edited. Returns the saved highlight with its id.',
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
  summary: 'Remove a highlight',
  description:
    "Takes the highlight id (not the note id) and returns 204. Deleting someone else's " +
    'highlight is a 404, not a 403 — the id simply does not exist for this student.',
  params: uuidParam,
} as const;
