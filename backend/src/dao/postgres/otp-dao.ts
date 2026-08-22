import { query, queryOne } from '../../config/db.js';
import type { OtpChallengeRow } from '../../models/user.js';
import type { IOtpDao } from '../interfaces/otp-dao.interface.js';

/**
 * `challenge_token` is a UUID column, so Postgres rejects anything that is not
 * one with a type error rather than an empty result. A caller sending a
 * malformed token is just wrong, not exceptional, so it has to read as
 * "no such challenge" instead of surfacing as a 500.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class OtpDao implements IOtpDao {
  async createChallenge(phone: string, otpHash: string, expiresAt: Date): Promise<string> {
    const row = await queryOne<{ challenge_token: string }>(
      `INSERT INTO otp_challenges (phone, otp_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING challenge_token`,
      [phone, otpHash, expiresAt.toISOString()],
    );
    return row!.challenge_token;
  }

  async findChallenge(challengeToken: string, phone: string): Promise<OtpChallengeRow | null> {
    if (!UUID_RE.test(challengeToken)) return null;
    return queryOne<OtpChallengeRow>(
      'SELECT * FROM otp_challenges WHERE challenge_token = $1 AND phone = $2',
      [challengeToken, phone],
    );
  }

  async recordFailedAttempt(id: string): Promise<number> {
    const row = await queryOne<{ attempts: number }>(
      'UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts',
      [id],
    );
    return row?.attempts ?? 0;
  }

  async deleteChallenge(id: string): Promise<void> {
    await query('DELETE FROM otp_challenges WHERE id = $1', [id]);
  }
}
