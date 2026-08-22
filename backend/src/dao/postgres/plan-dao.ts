import { queryOne } from '../../config/db.js';
import type { PlanRow } from '../../models/payment.js';
import type { IPlanDao } from '../interfaces/plan-dao.interface.js';

export class PlanDao implements IPlanDao {
  async findActive(): Promise<PlanRow | null> {
    return queryOne<PlanRow>('SELECT * FROM plans WHERE is_active = TRUE');
  }
}
