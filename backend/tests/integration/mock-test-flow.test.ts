import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { query, closePool } from '../../src/config/db.js';

/**
 * The full CBT journey over real HTTP: start → answer → mark → submit →
 * result — plus the two security properties that matter most: no answer key
 * during the test, and no access to anyone else's attempt.
 */
describe('mock test flow', () => {
  let app: FastifyInstance;
  let premiumToken: string;
  let lockedToken: string;
  let strangerToken: string;
  let testId: string;
  const questionIds: string[] = [];
  const userIds: string[] = [];

  async function makeUser(name: string, premium: boolean): Promise<string> {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO users (name, phone, is_premium) VALUES ($1, $2, $3) RETURNING id`,
      [name, `+9198765${String(10000 + userIds.length)}`, premium],
    );
    userIds.push(rows[0]!.id);
    return rows[0]!.id;
  }

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    premiumToken = app.jwt.sign({ sub: await makeUser('Premium Student', true) });
    lockedToken = app.jwt.sign({ sub: await makeUser('Locked Student', false) });
    strangerToken = app.jwt.sign({ sub: await makeUser('Other Premium', true) });

    const testRow = await query<{ id: string }>(
      `INSERT INTO tests (title, subject, duration_minutes) VALUES ('Integration Mock', 'mixed', 20) RETURNING id`,
    );
    testId = testRow.rows[0]!.id;

    const options: Array<['A' | 'B' | 'C' | 'D']> = [['A'], ['B'], ['C']];
    for (const [index, [correct]] of options.entries()) {
      const q = await query<{ id: string }>(
        `INSERT INTO questions (test_id, position, question_text, option_a, option_b, option_c, option_d, correct_option)
         VALUES ($1, $2, $3, 'a', 'b', 'c', 'd', $4) RETURNING id`,
        [testId, index + 1, `Q${index + 1}`, correct],
      );
      questionIds.push(q.rows[0]!.id);
    }
  });

  afterAll(async () => {
    await query('DELETE FROM tests WHERE id = $1', [testId]); // cascades to questions/attempts
    await query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    await app.close();
    await closePool();
  });

  it('locks the test detail behind payment (FR-P-01/03) but lists it to everyone logged in', async () => {
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/tests',
      headers: { authorization: `Bearer ${lockedToken}` },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().some((t: { id: string }) => t.id === testId)).toBe(true);

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/tests/${testId}`,
      headers: { authorization: `Bearer ${lockedToken}` },
    });
    expect(detail.statusCode).toBe(403);
    expect(detail.json().error.code).toBe('PAYMENT_REQUIRED');
  });

  it('runs the full attempt flow with server-side scoring', async () => {
    const auth = { authorization: `Bearer ${premiumToken}` };

    const startResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/tests/${testId}/attempts`,
      headers: auth,
    });
    expect(startResponse.statusCode).toBe(201);
    const state = startResponse.json();
    const attemptId = state.attemptId;

    // The answer key must not appear anywhere in a live response (FR-T-03).
    expect(startResponse.body).not.toContain('correct_option');
    expect(startResponse.body).not.toContain('correctOption');
    expect(state.questions).toHaveLength(3);
    expect(state.secondsRemaining).toBeGreaterThan(0);

    // Resume returns the same attempt (FR-T-04).
    const resume = await app.inject({ method: 'POST', url: `/api/v1/tests/${testId}/attempts`, headers: auth });
    expect(resume.json().attemptId).toBe(attemptId);

    // Q1 right, Q2 wrong (and flagged), Q3 left blank. Expected: +4 -1 = 3.
    for (const [questionId, chosenOption, markedForReview] of [
      [questionIds[0], 'A', false],
      [questionIds[1], 'C', true],
    ] as const) {
      const save = await app.inject({
        method: 'PUT',
        url: `/api/v1/attempts/${attemptId}/answers`,
        headers: auth,
        payload: { questionId, chosenOption, markedForReview },
      });
      expect(save.statusCode).toBe(200);
    }

    // A stranger cannot see or touch this attempt (FR-T-18).
    const strangerState = await app.inject({
      method: 'GET',
      url: `/api/v1/attempts/${attemptId}`,
      headers: { authorization: `Bearer ${strangerToken}` },
    });
    expect(strangerState.statusCode).toBe(404);

    // Refresh mid-test: state is all there, no answer key (FR-T-09).
    const liveState = await app.inject({ method: 'GET', url: `/api/v1/attempts/${attemptId}`, headers: auth });
    expect(liveState.json().answers).toHaveLength(2);
    expect(liveState.body).not.toContain('correctOption');
    expect(
      liveState.json().answers.find((a: { questionId: string }) => a.questionId === questionIds[1]).markedForReview,
    ).toBe(true);

    // The result is refused while the attempt is live (FR-T-17).
    const early = await app.inject({ method: 'GET', url: `/api/v1/attempts/${attemptId}/result`, headers: auth });
    expect(early.statusCode).toBe(409);

    const submit = await app.inject({ method: 'POST', url: `/api/v1/attempts/${attemptId}/submit`, headers: auth });
    expect(submit.statusCode).toBe(200);
    expect(submit.json()).toMatchObject({ score: 3, correctCount: 1, wrongCount: 1, unattemptedCount: 1 });

    const again = await app.inject({ method: 'POST', url: `/api/v1/attempts/${attemptId}/submit`, headers: auth });
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('ALREADY_SUBMITTED');

    // After submission the result releases the key (FR-T-16).
    const result = await app.inject({ method: 'GET', url: `/api/v1/attempts/${attemptId}/result`, headers: auth });
    expect(result.statusCode).toBe(200);
    expect(result.json().score).toBe(3);
    expect(result.json().questions[0].correctOption).toBe('A');

    // Saving after submission is refused.
    const lateSave = await app.inject({
      method: 'PUT',
      url: `/api/v1/attempts/${attemptId}/answers`,
      headers: auth,
      payload: { questionId: questionIds[2], chosenOption: 'C' },
    });
    expect(lateSave.statusCode).toBe(409);
  });
});
