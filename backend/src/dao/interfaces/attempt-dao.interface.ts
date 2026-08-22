import type { AttemptRow } from '../../models/test.js';

/**
 * The contract for attempts. Reads are scoped by user id in the query, so
 * another student's attempt id behaves exactly like one that does not exist
 * (FR-T-18).
 */
export interface IAttemptDao {
  findByIdForUser(id: string, userId: string): Promise<AttemptRow | null>;
  findInProgress(userId: string, testId: string): Promise<AttemptRow | null>;
  create(userId: string, testId: string, expiresAt: Date): Promise<AttemptRow>;
  /**
   * Marks the attempt submitted with its score — but only if it has not been
   * submitted already. Returns the updated row, or null if it was already
   * submitted (the caller decides that is a conflict).
   */
  submitOnce(id: string, score: number): Promise<AttemptRow | null>;
}
