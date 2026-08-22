import type { ITestDao } from '../dao/interfaces/test-dao.interface.js';
import type { TestListRow } from '../models/test.js';
import { NotFoundError } from '../exceptions/app-error.js';

export interface TestSummary {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  /** Open without paying — the catalogue badges this one "Free". */
  isFreeSample: boolean;
}

function toSummary(row: TestListRow): TestSummary {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    durationMinutes: row.duration_minutes,
    questionCount: row.question_count,
    totalMarks: row.total_marks,
    isFreeSample: row.is_free_sample,
  };
}

export class TestService {
  constructor(private readonly testDao: ITestDao) {}

  async list(): Promise<TestSummary[]> {
    const rows = await this.testDao.list();
    return rows.map(toSummary);
  }

  /** Test metadata only — questions arrive when an attempt starts (FR-T-03). */
  async get(id: string): Promise<TestSummary> {
    const row = await this.testDao.findById(id);
    if (!row) throw new NotFoundError('This test does not exist.');
    return toSummary(row);
  }
}
