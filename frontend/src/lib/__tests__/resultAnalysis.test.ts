import { describe, expect, it } from 'vitest';
import type { AttemptResult, ResultQuestion } from '../../api/tests.api';
import { analyseResult, toPlainText } from '../resultAnalysis';

function question(overrides: Partial<ResultQuestion> & { id: string }): ResultQuestion {
  return {
    position: 1,
    questionText: 'Q',
    options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    marks: 4,
    negativeMarks: 1,
    subject: null,
    section: null,
    correctOption: 'A',
    chosenOption: 'A',
    outcome: 'correct',
    ...overrides,
  };
}

function result(questions: ResultQuestion[]): AttemptResult {
  return {
    attemptId: 'att',
    testId: 'test',
    submittedAt: '2026-08-25T10:00:00Z',
    score: 0,
    totalMarks: 0,
    correctCount: 0,
    wrongCount: 0,
    unattemptedCount: 0,
    questions,
  };
}

describe('analyseResult', () => {
  it('groups questions by subject in the order they first appear', () => {
    const r = result([
      question({ id: '1', position: 1, subject: 'Physics' }),
      question({ id: '2', position: 2, subject: 'Chemistry' }),
      question({ id: '3', position: 3, subject: 'Physics' }),
    ]);
    expect(analyseResult(r).subjects.map((s) => s.subject)).toEqual(['Physics', 'Chemistry']);
  });

  it('counts outcomes, marks and accuracy per subject', () => {
    const r = result([
      question({ id: '1', subject: 'Physics', outcome: 'correct' }),
      question({ id: '2', subject: 'Physics', outcome: 'wrong', chosenOption: 'B' }),
      question({ id: '3', subject: 'Physics', outcome: 'unattempted', chosenOption: null }),
      question({ id: '4', subject: 'Physics', outcome: 'correct' }),
    ]);
    const [physics] = analyseResult(r).subjects;
    expect(physics).toMatchObject({
      subject: 'Physics',
      total: 4,
      correct: 2,
      wrong: 1,
      skipped: 1,
      scored: 7, // 2*4 - 1*1
      possible: 16,
      // accuracy is correct ÷ attempted, so skipping does not count against it
      accuracy: 67,
    });
  });

  it('reports 0 accuracy when nothing was attempted', () => {
    const r = result([question({ id: '1', subject: 'Botany', outcome: 'unattempted', chosenOption: null })]);
    expect(analyseResult(r).subjects[0]?.accuracy).toBe(0);
  });

  it('names the weakest and strongest subject by accuracy', () => {
    const r = result([
      question({ id: '1', subject: 'Physics', outcome: 'wrong', chosenOption: 'B' }),
      question({ id: '2', subject: 'Chemistry', outcome: 'correct' }),
      question({ id: '3', subject: 'Botany', outcome: 'correct' }),
      question({ id: '4', subject: 'Botany', outcome: 'wrong', chosenOption: 'B' }),
    ]);
    const a = analyseResult(r);
    expect(a.weakest?.subject).toBe('Physics');
    expect(a.strongest?.subject).toBe('Chemistry');
  });

  it('gives no weakest/strongest when there is only one subject', () => {
    const r = result([question({ id: '1', subject: 'Physics' })]);
    const a = analyseResult(r);
    expect(a.weakest).toBeNull();
    expect(a.strongest).toBeNull();
  });

  it('labels a paper with no subject breakdown as one group', () => {
    const r = result([question({ id: '1' }), question({ id: '2' })]);
    const a = analyseResult(r);
    expect(a.subjects).toHaveLength(1);
    expect(a.subjects[0]?.subject).toBe('All questions');
  });
});

describe('toPlainText', () => {
  it('unwraps formulas and drops figure markers', () => {
    expect(toPlainText('Speed is $v = u + at$ here [figure: img/1.png] end')).toBe(
      'Speed is v = u + at here [diagram] end',
    );
  });

  it('turns common TeX into readable text', () => {
    expect(toPlainText('cool from $61^\\circ C$')).toBe('cool from 61°C');
    expect(toPlainText('$E_0 / \\sqrt{2}$')).toBe('E0 / sqrt(2)');
    expect(toPlainText('$\\frac{a}{b} \\times 10^{-3}$')).toBe('(a)/(b) × 10^-3');
    expect(toPlainText('$x^2 + y^3$')).toBe('x² + y³');
    expect(toPlainText('$E_0 \\cos^2 \\omega t$')).toBe('E0 cos² omega t');
    expect(toPlainText('$0.91 \\, Jg^{-1}k^{-1}$')).toBe('0.91 Jg^-1k^-1');
    expect(toPlainText('$\\text{speed} \\left( \\mathrm{m/s} \\right)$')).toBe('speed ( m/s )');
  });

  it('collapses the whitespace left behind', () => {
    expect(toPlainText('a   b\n\nc')).toBe('a b c');
  });
});
