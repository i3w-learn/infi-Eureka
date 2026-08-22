import { apiRequest } from './client';

/**
 * The CBT mock-test API. Mirrors backend/src/types/test-schemas.ts exactly.
 *
 * The server is the authority on time: `expiresAt`/`secondsRemaining` come
 * from it, and it refuses answers after expiry — the client countdown is only
 * a display. Correct answers never appear in any during-test payload.
 */
export interface TestSummary {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  /** Open without paying. Exactly one test carries this. */
  isFreeSample: boolean;
}

export interface LiveQuestion {
  id: string;
  position: number;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  marks: number;
  negativeMarks: number;
  /** NEET subject tab this question sits under, e.g. 'Botany'. Null on papers
      seeded without a subject breakdown — the screen then shows one flat list. */
  subject: string | null;
  /** 'A' is compulsory, 'B' is "attempt any 10". Null alongside `subject`. */
  section: 'A' | 'B' | null;
}

export type Option = 'A' | 'B' | 'C' | 'D';

export interface SavedAnswer {
  questionId: string;
  chosenOption: Option | null;
  markedForReview: boolean;
}

export interface AttemptState {
  attemptId: string;
  testId: string;
  status: 'in_progress' | 'expired' | 'submitted';
  startedAt: string;
  expiresAt: string;
  secondsRemaining: number;
  questions: LiveQuestion[];
  answers: SavedAnswer[];
}

export interface ScoreSummary {
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
}

export interface ResultQuestion extends LiveQuestion {
  correctOption: Option;
  chosenOption: Option | null;
  outcome: 'correct' | 'wrong' | 'unattempted';
}

export interface AttemptResult extends ScoreSummary {
  attemptId: string;
  testId: string;
  submittedAt: string;
  questions: ResultQuestion[];
}

export const testsApi = {
  list: () => apiRequest<TestSummary[]>('/tests'),

  /** One test's headline details — the exam screen shows its title. */
  get: (testId: string) => apiRequest<TestSummary>(`/tests/${testId}`),

  /** Starts a new attempt — or returns the live one, so reloads resume. */
  startAttempt: (testId: string) =>
    apiRequest<AttemptState>(`/tests/${testId}/attempts`, { method: 'POST' }),

  attemptState: (attemptId: string) => apiRequest<AttemptState>(`/attempts/${attemptId}`),

  saveAnswer: (
    attemptId: string,
    input: { questionId: string; chosenOption: Option | null; markedForReview: boolean },
  ) => apiRequest<{ saved: boolean }>(`/attempts/${attemptId}/answers`, { method: 'PUT', body: input }),

  submit: (attemptId: string) =>
    apiRequest<ScoreSummary & { attemptId: string }>(`/attempts/${attemptId}/submit`, {
      method: 'POST',
    }),

  result: (attemptId: string) => apiRequest<AttemptResult>(`/attempts/${attemptId}/result`),
};
