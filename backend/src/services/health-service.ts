import type { IHealthDao } from '../dao/interfaces/health-dao.interface.js';

export interface HealthReport {
  status: 'ok' | 'degraded';
  database: 'ok' | 'error';
  uptimeSeconds: number;
}

/**
 * Reference example of how every service in this codebase is built:
 * it receives its dependencies through the constructor, typed as interfaces.
 * It never imports a concrete DAO and never writes SQL.
 */
export class HealthService {
  constructor(private readonly healthDao: IHealthDao) {}

  async check(): Promise<HealthReport> {
    const databaseUp = await this.healthDao.ping().catch(() => false);
    return {
      status: databaseUp ? 'ok' : 'degraded',
      database: databaseUp ? 'ok' : 'error',
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
