import { describe, expect, it } from 'vitest';
import { HealthService } from '../../src/services/health-service.js';
import type { IHealthDao } from '../../src/dao/interfaces/health-dao.interface.js';

/**
 * This test is the point of the interface-based wiring: the service is tested
 * with a fake DAO, so there is no database involved and no setup to do.
 * Every service test in this project follows this shape.
 */
class FakeHealthDao implements IHealthDao {
  constructor(private readonly result: boolean | Error) {}

  async ping(): Promise<boolean> {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

describe('HealthService', () => {
  it('reports ok when the database answers', async () => {
    const service = new HealthService(new FakeHealthDao(true));
    const report = await service.check();

    expect(report.status).toBe('ok');
    expect(report.database).toBe('ok');
  });

  it('reports degraded when the database is unreachable', async () => {
    const service = new HealthService(new FakeHealthDao(new Error('connection refused')));
    const report = await service.check();

    expect(report.status).toBe('degraded');
    expect(report.database).toBe('error');
  });
});
