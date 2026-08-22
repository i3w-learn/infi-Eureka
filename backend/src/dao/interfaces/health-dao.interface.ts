/**
 * The contract for reaching the database's health.
 *
 * Services depend on this interface, never on the Postgres class that
 * implements it — so a service can be tested with a fake, and the storage
 * engine can change without touching business logic.
 */
export interface IHealthDao {
  /** Returns true when the database answers a trivial query. */
  ping(): Promise<boolean>;
}
