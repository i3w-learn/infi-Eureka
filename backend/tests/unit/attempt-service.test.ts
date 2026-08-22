import { beforeEach, describe, expect, it } from 'vitest';
import { AttemptService } from '../../src/services/attempt-service.js';
import {
  AlreadySubmittedError,
  AttemptExpiredError,
  AttemptInProgressError,
  NotFoundError,
} from '../../src/exceptions/app-error.js';
import type { ITestDao } from '../../src/dao/interfaces/test-dao.interface.js';
import type { IQuestionDao } from '../../src/dao/interfaces/question-dao.interface.js';
import type { IAttemptDao } from '../../src/dao/interfaces/attempt-dao.interface.js';
import type {
  IAttemptAnswersDao,
  UpsertAnswerInput,
} from '../../src/dao/interfaces/attempt-answers-dao.interface.js';
import type {
  AttemptAnswerRow,
  AttemptRow,
  Option,
  QuestionWithAnswerRow,
  TestListRow,
} from '../../src/models/test.js';

const TEST_ID = 'test-1';
const USER_ID = 'user-1';

const test: TestListRow = {
  id: TEST_ID,
  title: 'Mini Mock',
  subject: 'mixed',
  duration_minutes: 20,
  created_at: '2026-01-01T00:00:00Z',
  question_count: 2,
  total_marks: 8,
};

const questions: QuestionWithAnswerRow[] = (['A', 'B'] as const).map((correct, index) => ({
  id: `q${index + 1}`,
  test_id: TEST_ID,
  position: index + 1,
  question_text: `Question ${index + 1}`,
  option_a: 'a',
  option_b: 'b',
  option_c: 'c',
  option_d: 'd',
  marks: 4,
  negative_marks: 1,
  subject: 'Botany',
  section: 'A',
  correct_option: correct,
}));

class FakeTestDao implements ITestDao {
  async list(): Promise<TestListRow[]> {
    return [test];
  }
  async findById(id: string): Promise<TestListRow | null> {
    return id === TEST_ID ? test : null;
  }
}

class FakeQuestionDao implements IQuestionDao {
  async listForAttempt(): Promise<QuestionWithAnswerRow[]> {
    return questions;
  }
  async listWithAnswers(): Promise<QuestionWithAnswerRow[]> {
    return questions;
  }
  async belongsToTest(questionId: string, testId: string): Promise<boolean> {
    return testId === TEST_ID && questions.some((q) => q.id === questionId);
  }
}

class FakeAttemptDao implements IAttemptDao {
  attempts = new Map<string, AttemptRow>();
  private nextId = 1;

  async findByIdForUser(id: string, userId: string): Promise<AttemptRow | null> {
    const row = this.attempts.get(id);
    return row && row.user_id === userId ? { ...row } : null;
  }

  async findInProgress(userId: string, testId: string): Promise<AttemptRow | null> {
    for (const row of this.attempts.values()) {
      if (row.user_id === userId && row.test_id === testId && !row.submitted_at) return { ...row };
    }
    return null;
  }

  async create(userId: string, testId: string, expiresAt: Date): Promise<AttemptRow> {
    const row: AttemptRow = {
      id: `attempt-${this.nextId++}`,
      user_id: userId,
      test_id: testId,
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      submitted_at: null,
      score: null,
    };
    this.attempts.set(row.id, row);
    return { ...row };
  }

  async submitOnce(id: string, score: number): Promise<AttemptRow | null> {
    const row = this.attempts.get(id);
    if (!row || row.submitted_at) return null;
    row.submitted_at = new Date().toISOString();
    row.score = score;
    return { ...row };
  }

  /** Test helper: force an attempt's deadline into the past. */
  expire(id: string): void {
    this.attempts.get(id)!.expires_at = new Date(Date.now() - 60_000).toISOString();
  }
}

class FakeAttemptAnswersDao implements IAttemptAnswersDao {
  answers = new Map<string, AttemptAnswerRow>();

  async upsert(input: UpsertAnswerInput): Promise<void> {
    this.answers.set(`${input.attemptId}:${input.questionId}`, {
      attempt_id: input.attemptId,
      question_id: input.questionId,
      chosen_option: input.chosenOption,
      marked_for_review: input.markedForReview,
      updated_at: new Date().toISOString(),
    });
  }

  async listForAttempt(attemptId: string): Promise<AttemptAnswerRow[]> {
    return [...this.answers.values()].filter((a) => a.attempt_id === attemptId);
  }
}

describe('AttemptService', () => {
  let attemptDao: FakeAttemptDao;
  let answersDao: FakeAttemptAnswersDao;
  let service: AttemptService;

  beforeEach(() => {
    attemptDao = new FakeAttemptDao();
    answersDao = new FakeAttemptAnswersDao();
    service = new AttemptService(new FakeTestDao(), new FakeQuestionDao(), attemptDao, answersDao);
  });

  async function startAndAnswer(chosen: Option): Promise<string> {
    const state = await service.start(USER_ID, TEST_ID);
    await service.saveAnswer(USER_ID, state.attemptId, { questionId: 'q1', chosenOption: chosen });
    return state.attemptId;
  }

  it('starts with a server-computed deadline and the full question set', async () => {
    const state = await service.start(USER_ID, TEST_ID);

    expect(state.status).toBe('in_progress');
    expect(state.secondsRemaining).toBeGreaterThan(19 * 60);
    expect(state.secondsRemaining).toBeLessThanOrEqual(20 * 60);
    expect(state.questions).toHaveLength(2);
  });

  it('never includes a correct answer in the live state (FR-T-03)', async () => {
    const state = await service.start(USER_ID, TEST_ID);
    expect(JSON.stringify(state)).not.toContain('correct');
  });

  it('a second start resumes the same attempt (FR-T-04)', async () => {
    const first = await service.start(USER_ID, TEST_ID);
    const second = await service.start(USER_ID, TEST_ID);
    expect(second.attemptId).toBe(first.attemptId);
  });

  it('a start after expiry closes the old attempt and begins a new one', async () => {
    const first = await service.start(USER_ID, TEST_ID);
    attemptDao.expire(first.attemptId);

    const second = await service.start(USER_ID, TEST_ID);

    expect(second.attemptId).not.toBe(first.attemptId);
    expect(attemptDao.attempts.get(first.attemptId)?.submitted_at).not.toBeNull();
  });

  it('rejects saving an answer after expiry (FR-T-11)', async () => {
    const attemptId = await startAndAnswer('A');
    attemptDao.expire(attemptId);

    await expect(
      service.saveAnswer(USER_ID, attemptId, { questionId: 'q2', chosenOption: 'B' }),
    ).rejects.toThrow(AttemptExpiredError);
  });

  it('rejects a question from a different test', async () => {
    const state = await service.start(USER_ID, TEST_ID);
    await expect(
      service.saveAnswer(USER_ID, state.attemptId, { questionId: 'ghost', chosenOption: 'A' }),
    ).rejects.toThrow(NotFoundError);
  });

  it("another user's attempt id behaves as missing (FR-T-18)", async () => {
    const state = await service.start(USER_ID, TEST_ID);
    await expect(service.state('someone-else', state.attemptId)).rejects.toThrow(NotFoundError);
  });

  it('submit scores on the server and can happen once (FR-T-12/15)', async () => {
    const attemptId = await startAndAnswer('A'); // correct: +4

    const summary = await service.submit(USER_ID, attemptId);
    expect(summary.score).toBe(4);
    expect(summary.correctCount).toBe(1);
    expect(summary.unattemptedCount).toBe(1);

    await expect(service.submit(USER_ID, attemptId)).rejects.toThrow(AlreadySubmittedError);
  });

  it('refuses a result before submission (FR-T-17)', async () => {
    const attemptId = await startAndAnswer('A');
    await expect(service.result(USER_ID, attemptId)).rejects.toThrow(AttemptInProgressError);
  });

  it('auto-submits an expired attempt when its result is requested (FR-T-14)', async () => {
    const attemptId = await startAndAnswer('B'); // wrong: -1
    attemptDao.expire(attemptId);

    const result = await service.result(USER_ID, attemptId);

    expect(result.score).toBe(-1);
    expect(result.wrongCount).toBe(1);
    expect(result.questions[0]!.correctOption).toBe('A');
  });

  it('the result releases correct answers and per-question outcomes (FR-T-16)', async () => {
    const attemptId = await startAndAnswer('A');
    await service.submit(USER_ID, attemptId);

    const result = await service.result(USER_ID, attemptId);

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toMatchObject({ chosenOption: 'A', correctOption: 'A', outcome: 'correct' });
    expect(result.questions[1]).toMatchObject({ chosenOption: null, outcome: 'unattempted' });
  });
});
