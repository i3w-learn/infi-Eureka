import type { IAttemptDao } from '../dao/interfaces/attempt-dao.interface.js';
import type { IAttemptAnswersDao } from '../dao/interfaces/attempt-answers-dao.interface.js';
import type { IQuestionDao } from '../dao/interfaces/question-dao.interface.js';
import type { ITestDao } from '../dao/interfaces/test-dao.interface.js';
import type { AttemptAnswerRow, AttemptRow, Option, QuestionRow, QuestionWithAnswerRow } from '../models/test.js';
import {
  AlreadySubmittedError,
  AttemptExpiredError,
  AttemptInProgressError,
  NotFoundError,
} from '../exceptions/app-error.js';

export interface AttemptQuestionView {
  id: string;
  position: number;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  marks: number;
  negativeMarks: number;
}

export interface SavedAnswerView {
  questionId: string;
  chosenOption: Option | null;
  markedForReview: boolean;
}

export interface AttemptState {
  attemptId: string;
  testId: string;
  status: 'in_progress' | 'expired' | 'submitted';
  startedAt: string;
  expiresAt: string;
  secondsRemaining: number;
  questions: AttemptQuestionView[];
  answers: SavedAnswerView[];
}

export interface SaveAnswerInput {
  questionId: string;
  chosenOption?: Option | null | undefined;
  markedForReview?: boolean | undefined;
}

export interface ScoreSummary {
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
}

export interface AttemptResult extends ScoreSummary {
  attemptId: string;
  testId: string;
  submittedAt: string;
  questions: Array<
    AttemptQuestionView & {
      correctOption: Option;
      chosenOption: Option | null;
      outcome: 'correct' | 'wrong' | 'unattempted';
    }
  >;
}

/**
 * NEET marking, pure and testable (FR-T-13): +marks for a correct answer,
 * -negative_marks for a wrong one, 0 for unattempted. Per-question values come
 * from the questions table, not constants.
 */
export function scoreAttempt(
  questions: readonly QuestionWithAnswerRow[],
  chosenByQuestionId: ReadonlyMap<string, Option | null>,
): ScoreSummary {
  let score = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;

  for (const question of questions) {
    totalMarks += question.marks;
    const chosen = chosenByQuestionId.get(question.id) ?? null;
    if (chosen === null) {
      unattemptedCount += 1;
    } else if (chosen === question.correct_option) {
      score += question.marks;
      correctCount += 1;
    } else {
      score -= question.negative_marks;
      wrongCount += 1;
    }
  }

  return { score, totalMarks, correctCount, wrongCount, unattemptedCount };
}

function isExpired(attempt: AttemptRow, now: Date): boolean {
  return now.getTime() > new Date(attempt.expires_at).getTime();
}

function toQuestionView(question: QuestionRow): AttemptQuestionView {
  return {
    id: question.id,
    position: question.position,
    questionText: question.question_text,
    options: { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d },
    marks: question.marks,
    negativeMarks: question.negative_marks,
  };
}

function chosenMap(answers: readonly AttemptAnswerRow[]): Map<string, Option | null> {
  return new Map(answers.map((a) => [a.question_id, a.chosen_option]));
}

export class AttemptService {
  constructor(
    private readonly testDao: ITestDao,
    private readonly questionDao: IQuestionDao,
    private readonly attemptDao: IAttemptDao,
    private readonly attemptAnswersDao: IAttemptAnswersDao,
  ) {}

  /**
   * Start a test — or resume it: a second start while one attempt is live
   * returns that attempt (FR-T-04). An expired leftover attempt is scored and
   * closed first (FR-T-14), then a fresh one begins.
   */
  async start(userId: string, testId: string): Promise<AttemptState> {
    const test = await this.testDao.findById(testId);
    if (!test) throw new NotFoundError('This test does not exist.');

    const now = new Date();
    const existing = await this.attemptDao.findInProgress(userId, testId);
    if (existing) {
      if (!isExpired(existing, now)) return this.buildState(existing, now);
      await this.finalise(existing);
    }

    const expiresAt = new Date(now.getTime() + test.duration_minutes * 60 * 1000);
    const attempt = await this.attemptDao.create(userId, testId, expiresAt);
    return this.buildState(attempt, now);
  }

  /** The live state — questions, saved answers, server-computed seconds left (FR-T-09/10). */
  async state(userId: string, attemptId: string): Promise<AttemptState> {
    const attempt = await this.attemptDao.findByIdForUser(attemptId, userId);
    if (!attempt) throw new NotFoundError('This attempt does not exist.');
    return this.buildState(attempt, new Date());
  }

  async saveAnswer(userId: string, attemptId: string, input: SaveAnswerInput): Promise<void> {
    const attempt = await this.attemptDao.findByIdForUser(attemptId, userId);
    if (!attempt) throw new NotFoundError('This attempt does not exist.');
    if (attempt.submitted_at) throw new AlreadySubmittedError();
    if (isExpired(attempt, new Date())) throw new AttemptExpiredError();

    if (!(await this.questionDao.belongsToTest(input.questionId, attempt.test_id))) {
      throw new NotFoundError('This question is not part of the test.');
    }

    await this.attemptAnswersDao.upsert({
      attemptId,
      questionId: input.questionId,
      chosenOption: input.chosenOption ?? null,
      markedForReview: input.markedForReview ?? false,
    });
  }

  /**
   * Scores on the server and closes the attempt (FR-T-12). Allowed after the
   * deadline too — time running out must not lose a student's work; whatever
   * was saved before expiry is what gets scored.
   */
  async submit(userId: string, attemptId: string): Promise<ScoreSummary & { attemptId: string }> {
    const attempt = await this.attemptDao.findByIdForUser(attemptId, userId);
    if (!attempt) throw new NotFoundError('This attempt does not exist.');
    if (attempt.submitted_at) throw new AlreadySubmittedError();

    const summary = await this.finalise(attempt);
    return { attemptId, ...summary };
  }

  /** The full breakdown, correct answers included — submitted attempts only (FR-T-16/17). */
  async result(userId: string, attemptId: string): Promise<AttemptResult> {
    let attempt = await this.attemptDao.findByIdForUser(attemptId, userId);
    if (!attempt) throw new NotFoundError('This attempt does not exist.');

    if (!attempt.submitted_at) {
      // Expired but never submitted: score what was saved (FR-T-14).
      if (!isExpired(attempt, new Date())) throw new AttemptInProgressError();
      await this.finalise(attempt);
      attempt = (await this.attemptDao.findByIdForUser(attemptId, userId))!;
    }

    const questions = await this.questionDao.listWithAnswers(attempt.test_id);
    const answers = await this.attemptAnswersDao.listForAttempt(attemptId);
    const chosen = chosenMap(answers);
    const summary = scoreAttempt(questions, chosen);

    return {
      attemptId,
      testId: attempt.test_id,
      submittedAt: attempt.submitted_at!,
      ...summary,
      score: attempt.score ?? summary.score,
      questions: questions.map((question) => {
        const pick = chosen.get(question.id) ?? null;
        return {
          ...toQuestionView(question),
          correctOption: question.correct_option,
          chosenOption: pick,
          outcome: pick === null ? 'unattempted' : pick === question.correct_option ? 'correct' : 'wrong',
        };
      }),
    };
  }

  /** Scores the saved answers and marks the attempt submitted, exactly once. */
  private async finalise(attempt: AttemptRow): Promise<ScoreSummary> {
    const questions = await this.questionDao.listWithAnswers(attempt.test_id);
    const answers = await this.attemptAnswersDao.listForAttempt(attempt.id);
    const summary = scoreAttempt(questions, chosenMap(answers));

    const submitted = await this.attemptDao.submitOnce(attempt.id, summary.score);
    if (!submitted) throw new AlreadySubmittedError();
    return summary;
  }

  private async buildState(attempt: AttemptRow, now: Date): Promise<AttemptState> {
    const questions = await this.questionDao.listForAttempt(attempt.test_id);
    const answers = await this.attemptAnswersDao.listForAttempt(attempt.id);
    const secondsRemaining = Math.max(
      0,
      Math.floor((new Date(attempt.expires_at).getTime() - now.getTime()) / 1000),
    );

    return {
      attemptId: attempt.id,
      testId: attempt.test_id,
      status: attempt.submitted_at ? 'submitted' : isExpired(attempt, now) ? 'expired' : 'in_progress',
      startedAt: attempt.started_at,
      expiresAt: attempt.expires_at,
      secondsRemaining,
      questions: questions.map(toQuestionView),
      answers: answers.map((a) => ({
        questionId: a.question_id,
        chosenOption: a.chosen_option,
        markedForReview: a.marked_for_review,
      })),
    };
  }
}
