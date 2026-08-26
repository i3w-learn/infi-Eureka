import { UUID_PATTERN, uuidParam } from './schema-common.js';

const testSummarySchema = {
  type: 'object',
  required: [
    'id',
    'title',
    'subject',
    'durationMinutes',
    'questionCount',
    'totalMarks',
    'isFreeSample',
  ],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    subject: { type: 'string' },
    durationMinutes: { type: 'integer' },
    questionCount: { type: 'integer' },
    totalMarks: { type: 'integer' },
    isFreeSample: { type: 'boolean' },
  },
} as const;

/**
 * A question as seen DURING a test. There is deliberately no correctOption
 * property: the response schema strips anything not listed, so even a bug that
 * fetched the answer key could not leak it over the wire (FR-T-03).
 */
const liveQuestionSchema = {
  type: 'object',
  required: ['id', 'position', 'questionText', 'options', 'marks', 'negativeMarks', 'subject', 'section'],
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
    subject: { type: ['string', 'null'] },
    section: { type: ['string', 'null'], enum: ['A', 'B', null] },
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
  summary: 'Browse the mock tests',
  description:
    'Any signed-in student sees the whole list. The one flagged `isFreeSample: true` can be opened ' +
    'and taken without paying; the rest need premium.',
  response: {
    200: { type: 'array', items: testSummarySchema },
  },
} as const;

export const getTestSchema = {
  summary: "One test's cover details",
  description:
    'Duration, question count and total marks — what a student sees before deciding to start. The ' +
    'free sample opens for anyone signed in; the others need premium.',
  params: uuidParam,
  response: {
    200: testSummarySchema,
  },
} as const;

export const startAttemptSchema = {
  summary: 'Start (or resume) an attempt at a test',
  description:
    'Step 1 of taking a test. Calling it while an attempt is already live returns that same attempt ' +
    'rather than starting a new one, so a refresh mid-test is safe. The response is the full paper ' +
    'plus any answers already saved; `secondsRemaining` counts down to `expiresAt`. The answer key is ' +
    'deliberately absent — it only appears in the result.',
  params: uuidParam,
  response: {
    201: attemptStateSchema,
  },
} as const;

export const attemptStateResponseSchema = {
  summary: 'The current state of an attempt',
  description:
    'Everything needed to rebuild the test screen after a reload: questions, saved answers, and ' +
    '`secondsRemaining`. Still no correct answers. Status flips to `expired` once the clock runs out.',
  params: uuidParam,
  response: {
    200: attemptStateSchema,
  },
} as const;

export const saveAnswerSchema = {
  summary: 'Save one answer',
  description:
    'Called every time the student picks an option or flags a question, one question per call. ' +
    'Re-sending the same question overwrites it, so retries are harmless. `chosenOption: null` clears ' +
    'a choice; `markedForReview` is the flag-for-later toggle. Rejected once the attempt is submitted ' +
    'or expired.',
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
  summary: 'Submit the attempt and get the score',
  description:
    'Ends the attempt and marks it — NEET rules, so a wrong answer costs `negativeMarks`. The attempt ' +
    'then locks: no more answers. Returns the score summary; call `/result` for the ' +
    'question-by-question breakdown.',
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
  summary: 'The full result with the answer key',
  description:
    'Only available after submit. This is the one place `correctOption` is ever sent, alongside what ' +
    'the student chose and whether each question came out correct, wrong or unattempted.',
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
              'subject', 'section', 'correctOption', 'chosenOption', 'outcome',
            ],
            properties: {
              id: { type: 'string' },
              position: { type: 'integer' },
              questionText: { type: 'string' },
              options: liveQuestionSchema.properties.options,
              marks: { type: 'integer' },
              negativeMarks: { type: 'integer' },
              subject: liveQuestionSchema.properties.subject,
              section: liveQuestionSchema.properties.section,
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
