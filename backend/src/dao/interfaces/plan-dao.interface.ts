import type { PlanRow } from '../../models/payment.js';

/** The contract for pricing. The active plan is the single source of price. */
export interface IPlanDao {
  findActive(): Promise<PlanRow | null>;
}
