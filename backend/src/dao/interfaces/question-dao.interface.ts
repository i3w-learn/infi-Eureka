import type { QuestionRow, QuestionWithAnswerRow } from '../../models/test.js';

/**
 * Two deliberately separate reads (DR-06):
 *
 * - `listForAttempt` never selects `correct_option`, so an answer physically
 *   cannot leak into a live test — it is not in the result set to begin with.
 * - `listWithAnswers` is called only when scoring or building a result for a
 *   submitted attempt.
 */
export interface IQuestionDao {
  listForAttempt(testId: string): Promise<QuestionRow[]>;
  listWithAnswers(testId: string): Promise<QuestionWithAnswerRow[]>;
  /** Cheap membership check used on every answer save. */
  belongsToTest(questionId: string, testId: string): Promise<boolean>;
}
