import { queryOne } from '../../config/db.js';
import type { IHealthDao } from '../interfaces/health-dao.interface.js';

export class HealthDao implements IHealthDao {
  async ping(): Promise<boolean> {
    const row = await queryOne<{ ok: number }>('SELECT 1 AS ok');
    return row?.ok === 1;
  }
}
