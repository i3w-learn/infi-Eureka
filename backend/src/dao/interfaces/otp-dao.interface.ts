import type { OtpChallengeRow } from '../../models/user.js';

/** The contract for storing and checking OTP challenges. */
export interface IOtpDao {
  /** Stores a hashed OTP for a phone; returns the challenge token to hand back. */
  createChallenge(phone: string, otpHash: string, expiresAt: Date): Promise<string>;
  /** The challenge for this token and phone, or null. May be expired — the service decides. */
  findChallenge(challengeToken: string, phone: string): Promise<OtpChallengeRow | null>;
  /** Counts a wrong guess; returns the new total. */
  recordFailedAttempt(id: string): Promise<number>;
  /** A used or spent challenge is deleted, never reused. */
  deleteChallenge(id: string): Promise<void>;
}
