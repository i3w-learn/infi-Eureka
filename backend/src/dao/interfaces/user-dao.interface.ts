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
}
