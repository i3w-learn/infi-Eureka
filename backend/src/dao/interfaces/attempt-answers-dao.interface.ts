import type { AttemptAnswerRow, Option } from '../../models/test.js';

export interface UpsertAnswerInput {
  attemptId: string;
  questionId: string;
  chosenOption: Option | null;
  markedForReview: boolean;
}

/** The contract for a student's saved answers within one attempt. */
export interface IAttemptAnswersDao {
  /** Insert or overwrite — never duplicate (FR-T-06). */
  upsert(input: UpsertAnswerInput): Promise<void>;
  listForAttempt(attemptId: string): Promise<AttemptAnswerRow[]>;
}
