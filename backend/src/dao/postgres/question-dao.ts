import { query } from '../../config/db.js';
import type { QuestionRow, QuestionWithAnswerRow } from '../../models/test.js';
import type { IQuestionDao } from '../interfaces/question-dao.interface.js';

/**
 * The column list for a live attempt is written out by hand, with no
 * `correct_option` in it, on purpose (DR-06). Do not replace it with `*`.
 */
const SAFE_COLUMNS =
  'id, test_id, position, question_text, option_a, option_b, option_c, option_d, marks, negative_marks, subject, section';

export class QuestionDao implements IQuestionDao {
  async listForAttempt(testId: string): Promise<QuestionRow[]> {
    const result = await query<QuestionRow>(
      `SELECT ${SAFE_COLUMNS} FROM questions WHERE test_id = $1 ORDER BY position`,
      [testId],
    );
    return result.rows;
  }

  async listWithAnswers(testId: string): Promise<QuestionWithAnswerRow[]> {
    const result = await query<QuestionWithAnswerRow>(
      `SELECT ${SAFE_COLUMNS}, correct_option FROM questions WHERE test_id = $1 ORDER BY position`,
      [testId],
    );
    return result.rows;
  }

  async belongsToTest(questionId: string, testId: string): Promise<boolean> {
    const result = await query('SELECT 1 FROM questions WHERE id = $1 AND test_id = $2', [
      questionId,
      testId,
    ]);
    return result.rowCount === 1;
  }
}
