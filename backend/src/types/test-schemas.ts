import { UUID_PATTERN, uuidParam } from './schema-common.js';

const testSummarySchema = {
  type: 'object',
  required: ['id', 'title', 'subject', 'durationMinutes', 'questionCount', 'totalMarks'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    subject: { type: 'string' },
    durationMinutes: { type: 'integer' },
    questionCount: { type: 'integer' },
    totalMarks: { type: 'integer' },
  },
} as const;

/**
 * A question as seen DURING a test. There is deliberately no correctOption
 * property: the response schema strips anything not listed, so even a bug that
 * fetched the answer key could not leak it over the wire (FR-T-03).
 */
const liveQuestionSchema = {
  type: 'object',
  required: ['id', 'position', 'questionText', 'options', 'marks', 'negativeMarks'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    position: { type: 'integer' },
    questionText: { type: 'string' },
    options: {
      type: 'object',
      required: ['A', 'B', 'C', 'D'],
      additionalProperties: false,
      properties: {
        A: { type: 'string' },
        B: { type: 'string' },
        C: { type: 'string' },
        D: { type: 'string' },
      },
    },
    marks: { type: 'integer' },
    negativeMarks: { type: 'integer' },
  },
} as const;

const savedAnswerSchema = {
  type: 'object',
  required: ['questionId', 'chosenOption', 'markedForReview'],
  properties: {
    questionId: { type: 'string' },
    chosenOption: { type: ['string', 'null'], enum: ['A', 'B', 'C', 'D', null] },
    markedForReview: { type: 'boolean' },
  },
} as const;

const attemptStateSchema = {
  type: 'object',
  required: ['attemptId', 'testId', 'status', 'startedAt', 'expiresAt', 'secondsRemaining', 'questions', 'answers'],
  properties: {
    attemptId: { type: 'string' },
    testId: { type: 'string' },
    status: { type: 'string', enum: ['in_progress', 'expired', 'submitted'] },
    startedAt: { type: 'string' },
    expiresAt: { type: 'string' },
    secondsRemaining: { type: 'integer' },
    questions: { type: 'array', items: liveQuestionSchema },
    answers: { type: 'array', items: savedAnswerSchema },
  },
} as const;

const scoreSummaryProperties = {
  score: { type: 'integer' },
  totalMarks: { type: 'integer' },
  correctCount: { type: 'integer' },
  wrongCount: { type: 'integer' },
  unattemptedCount: { type: 'integer' },
} as const;

export const listTestsSchema = {
  response: {
    200: { type: 'array', items: testSummarySchema },
  },
} as const;

export const getTestSchema = {
  params: uuidParam,
  response: {
    200: testSummarySchema,
  },
} as const;

export const startAttemptSchema = {
  params: uuidParam,
  response: {
    201: attemptStateSchema,
  },
} as const;

export const attemptStateResponseSchema = {
  params: uuidParam,
  response: {
    200: attemptStateSchema,
  },
} as const;

export const saveAnswerSchema = {
  params: uuidParam,
  body: {
    type: 'object',
    required: ['questionId'],
    additionalProperties: false,
    properties: {
      questionId: { type: 'string', pattern: UUID_PATTERN },
      chosenOption: { type: ['string', 'null'], enum: ['A', 'B', 'C', 'D', null] },
      markedForReview: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['saved'],
      properties: { saved: { type: 'boolean' } },
    },
  },
} as const;

export const submitAttemptSchema = {
  params: uuidParam,
  response: {
    200: {
      type: 'object',
      required: ['attemptId', 'score', 'totalMarks', 'correctCount', 'wrongCount', 'unattemptedCount'],
      properties: {
        attemptId: { type: 'string' },
        ...scoreSummaryProperties,
      },
    },
  },
} as const;

export const attemptResultSchema = {
  params: uuidParam,
  response: {
    200: {
      type: 'object',
      required: [
        'attemptId', 'testId', 'submittedAt',
        'score', 'totalMarks', 'correctCount', 'wrongCount', 'unattemptedCount', 'questions',
      ],
      properties: {
        attemptId: { type: 'string' },
        testId: { type: 'string' },
        submittedAt: { type: 'string' },
        ...scoreSummaryProperties,
        questions: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'id', 'position', 'questionText', 'options', 'marks', 'negativeMarks',
              'correctOption', 'chosenOption', 'outcome',
            ],
            properties: {
              id: { type: 'string' },
              position: { type: 'integer' },
              questionText: { type: 'string' },
              options: liveQuestionSchema.properties.options,
              marks: { type: 'integer' },
              negativeMarks: { type: 'integer' },
              correctOption: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
              chosenOption: { type: ['string', 'null'], enum: ['A', 'B', 'C', 'D', null] },
              outcome: { type: 'string', enum: ['correct', 'wrong', 'unattempted'] },
            },
          },
        },
      },
    },
  },
} as const;
