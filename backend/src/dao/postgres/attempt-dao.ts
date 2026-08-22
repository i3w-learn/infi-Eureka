import { query, queryOne } from '../../config/db.js';
import type { AttemptRow } from '../../models/test.js';
import type { IAttemptDao } from '../interfaces/attempt-dao.interface.js';

export class AttemptDao implements IAttemptDao {
  async findByIdForUser(id: string, userId: string): Promise<AttemptRow | null> {
    return queryOne<AttemptRow>('SELECT * FROM attempts WHERE id = $1 AND user_id = $2', [id, userId]);
  }

  async findInProgress(userId: string, testId: string): Promise<AttemptRow | null> {
    return queryOne<AttemptRow>(
      'SELECT * FROM attempts WHERE user_id = $1 AND test_id = $2 AND submitted_at IS NULL',
      [userId, testId],
    );
  }

  async create(userId: string, testId: string, expiresAt: Date): Promise<AttemptRow> {
    const result = await query<AttemptRow>(
      `INSERT INTO attempts (user_id, test_id, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, testId, expiresAt.toISOString()],
    );
    return result.rows[0]!;
  }

  async submitOnce(id: string, score: number): Promise<AttemptRow | null> {
    // The WHERE clause is the "exactly once" guarantee (FR-T-15): two racing
    // submits both reach the database, but only one finds submitted_at NULL.
    return queryOne<AttemptRow>(
      `UPDATE attempts
          SET submitted_at = NOW(), score = $2
        WHERE id = $1 AND submitted_at IS NULL
        RETURNING *`,
      [id, score],
    );
  }
}
