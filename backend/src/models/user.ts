/** A row in the `users` table, as stored. */
export interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  class: string | null;
  subjects: string[] | null;
  goals: string[] | null;
  learning_preference: string[] | null;
  is_premium: boolean;
  created_at: string;
}

/** A row in the `otp_challenges` table. */
export interface OtpChallengeRow {
  id: string;
  phone: string;
  otp_hash: string;
  challenge_token: string;
  attempts: number;
  expires_at: string;
  created_at: string;
}
