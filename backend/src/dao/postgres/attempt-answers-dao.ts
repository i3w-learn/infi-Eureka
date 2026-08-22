import { query } from '../../config/db.js';
import type { AttemptAnswerRow } from '../../models/test.js';
import type { IAttemptAnswersDao, UpsertAnswerInput } from '../interfaces/attempt-answers-dao.interface.js';

export class AttemptAnswersDao implements IAttemptAnswersDao {
  async upsert(input: UpsertAnswerInput): Promise<void> {
    await query(
      `INSERT INTO attempt_answers (attempt_id, question_id, chosen_option, marked_for_review)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (attempt_id, question_id) DO UPDATE
         SET chosen_option     = EXCLUDED.chosen_option,
             marked_for_review = EXCLUDED.marked_for_review,
             updated_at        = NOW()`,
      [input.attemptId, input.questionId, input.chosenOption, input.markedForReview],
    );
  }

  async listForAttempt(attemptId: string): Promise<AttemptAnswerRow[]> {
    const result = await query<AttemptAnswerRow>(
      'SELECT * FROM attempt_answers WHERE attempt_id = $1',
      [attemptId],
    );
    return result.rows;
  }
}
