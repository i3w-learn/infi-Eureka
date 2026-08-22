import { describe, expect, it } from 'vitest';
import { scoreAttempt } from '../../src/services/attempt-service.js';
import type { Option, QuestionWithAnswerRow } from '../../src/models/test.js';

function question(id: string, correct: Option, marks = 4, negativeMarks = 1): QuestionWithAnswerRow {
  return {
    id,
    test_id: 't1',
    position: Number(id.slice(1)),
    question_text: `Question ${id}`,
    option_a: 'a',
    option_b: 'b',
    option_c: 'c',
    option_d: 'd',
    marks,
    negative_marks: negativeMarks,
    subject: 'Botany',
    section: 'A',
    correct_option: correct,
  };
}

describe('scoreAttempt — NEET marking (FR-T-13)', () => {
  const questions = [question('q1', 'A'), question('q2', 'B'), question('q3', 'C'), question('q4', 'D'), question('q5', 'A')];

  it('scores the SRS example: 3 right, 1 wrong, 1 blank = 11', () => {
    const chosen = new Map<string, Option | null>([
      ['q1', 'A'],
      ['q2', 'B'],
      ['q3', 'C'],
      ['q4', 'A'], // wrong
      // q5 unattempted
    ]);
    const result = scoreAttempt(questions, chosen);

    expect(result.score).toBe(11);
    expect(result.correctCount).toBe(3);
    expect(result.wrongCount).toBe(1);
    expect(result.unattemptedCount).toBe(1);
    expect(result.totalMarks).toBe(20);
  });

  it('scores all correct', () => {
    const chosen = new Map<string, Option | null>([
      ['q1', 'A'], ['q2', 'B'], ['q3', 'C'], ['q4', 'D'], ['q5', 'A'],
    ]);
    expect(scoreAttempt(questions, chosen).score).toBe(20);
  });

  it('scores all wrong', () => {
    const chosen = new Map<string, Option | null>([
      ['q1', 'B'], ['q2', 'A'], ['q3', 'A'], ['q4', 'A'], ['q5', 'B'],
    ]);
    expect(scoreAttempt(questions, chosen).score).toBe(-5);
  });

  it('scores a blank paper as zero', () => {
    const result = scoreAttempt(questions, new Map());
    expect(result.score).toBe(0);
    expect(result.unattemptedCount).toBe(5);
  });

  it('treats a cleared answer (null) as unattempted, not wrong (FR-T-07)', () => {
    const chosen = new Map<string, Option | null>([['q1', null]]);
    const result = scoreAttempt(questions, chosen);
    expect(result.score).toBe(0);
    expect(result.unattemptedCount).toBe(5);
    expect(result.wrongCount).toBe(0);
  });

  it('reads marks per question from the row, not constants', () => {
    const custom = [question('q1', 'A', 5, 2), question('q2', 'B', 3, 0)];
    const chosen = new Map<string, Option | null>([
      ['q1', 'B'], // wrong: -2
      ['q2', 'B'], // right: +3
    ]);
    const result = scoreAttempt(custom, chosen);
    expect(result.score).toBe(1);
    expect(result.totalMarks).toBe(8);
  });

  it('ignores an answer for a question not in the paper', () => {
    const chosen = new Map<string, Option | null>([['ghost', 'A']]);
    expect(scoreAttempt(questions, chosen).score).toBe(0);
  });
});
