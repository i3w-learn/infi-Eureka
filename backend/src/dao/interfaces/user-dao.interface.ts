import type { UserRow } from '../../models/user.js';

export interface CreateUserInput {
  phone: string;
  /** ISO date (yyyy-mm-dd) — the service converts from dd-mm-yyyy. */
  dateOfBirth: string;
  username?: string | undefined;
  studentClass?: string | undefined;
  subjects?: string[] | undefined;
  goals?: string[] | undefined;
  learningPreference?: string[] | undefined;
}

/**
 * The contract for reading and writing users.
 *
 * Services depend on this interface, never on the Postgres class that
 * implements it.
 */
export interface IUserDao {
  findById(id: string): Promise<UserRow | null>;
  findByPhone(phone: string): Promise<UserRow | null>;
  /** Throws on duplicate phone — the DAO surfaces it, the service names it. */
  create(input: CreateUserInput): Promise<UserRow>;
  /**
   * Whether this user has paid. Read fresh on every gated request rather than
   * trusted from the token, so access granted or revoked takes effect at once.
   * Returns false for a user id that no longer exists.
   */
  isPremium(userId: string): Promise<boolean>;
  /**
   * Wipes an account and everything hanging off it, by phone number. Returns
   * false when no account has that number — the caller decides whether that is
   * a 404 or a no-op.
   *
   * Highlights and attempts go by themselves (ON DELETE CASCADE). Payments do
   * not: that foreign key is ON DELETE RESTRICT, so they have to be removed
   * first or Postgres refuses the whole delete. OTP challenges are keyed by
   * phone with no foreign key at all, so they would otherwise be left behind.
   */
  deleteByPhone(phone: string): Promise<boolean>;
  /**
   * Unlocks an account without a payment. Only the dev-only test account uses
   * this — a real unlock goes through the payments flow, which records what
   * was paid. Never call this from a request path.
   */
  grantPremium(userId: string): Promise<void>;
}
