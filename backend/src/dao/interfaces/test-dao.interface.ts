import type { TestListRow } from '../../models/test.js';

/** The contract for the mock-test catalogue. */
export interface ITestDao {
  /** Tests with their question count and total marks (FR-T-01). */
  list(): Promise<TestListRow[]>;
  findById(id: string): Promise<TestListRow | null>;
}
