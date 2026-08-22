import { query, queryOne } from '../../config/db.js';
import type { TestListRow } from '../../models/test.js';
import type { ITestDao } from '../interfaces/test-dao.interface.js';

function listSql(where: string): string {
  return `
    SELECT t.*,
           COUNT(q.id)::int               AS question_count,
           COALESCE(SUM(q.marks), 0)::int AS total_marks
      FROM tests t
      LEFT JOIN questions q ON q.test_id = t.id
      ${where}
     GROUP BY t.id`;
}

export class TestDao implements ITestDao {
  /** Free sample first — it leads the shelf, since it is what sells the rest. */
  async list(): Promise<TestListRow[]> {
    const result = await query<TestListRow>(
      `${listSql('')} ORDER BY t.is_free_sample DESC, t.title`,
    );
    return result.rows;
  }

  async findById(id: string): Promise<TestListRow | null> {
    return queryOne<TestListRow>(listSql('WHERE t.id = $1'), [id]);
  }

  async isFreeSample(id: string): Promise<boolean> {
    const row = await queryOne<{ is_free_sample: boolean }>(
      'SELECT is_free_sample FROM tests WHERE id = $1',
      [id],
    );
    return row?.is_free_sample ?? false;
  }
}
