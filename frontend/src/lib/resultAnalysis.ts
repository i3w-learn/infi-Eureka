import type { AttemptResult, ResultQuestion } from '../api/tests.api';

/**
 * Turns a scored attempt into the numbers the performance charts and the PDF
 * report both read from. Pure: no React, no DOM, so it is unit-tested directly.
 *
 * "Accuracy" is correct ÷ attempted, deliberately not correct ÷ total. A
 * student who skipped half of Physics but got every attempted one right has
 * a coverage problem, not an accuracy problem — the skipped count says so
 * separately, and folding it into accuracy would hide which of the two it is.
 */
export interface SubjectBreakdown {
  subject: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** Marks earned in this subject after negative marking. */
  scored: number;
  /** Marks on offer in this subject. */
  possible: number;
  /** Whole-number percentage of attempted questions answered correctly. */
  accuracy: number;
}

export interface ResultAnalysis {
  subjects: SubjectBreakdown[];
  /** Lowest-accuracy subject — null unless there are at least two subjects. */
  weakest: SubjectBreakdown | null;
  /** Highest-accuracy subject — null unless there are at least two subjects. */
  strongest: SubjectBreakdown | null;
}

/** Label for papers seeded without a subject on their questions. */
export const NO_SUBJECT_LABEL = 'All questions';

export function analyseResult(result: AttemptResult): ResultAnalysis {
  const groups = new Map<string, SubjectBreakdown>();

  const ordered = result.questions.slice().sort((a, b) => a.position - b.position);
  for (const q of ordered) {
    const key = q.subject ?? NO_SUBJECT_LABEL;
    let group = groups.get(key);
    if (!group) {
      group = {
        subject: key,
        total: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        scored: 0,
        possible: 0,
        accuracy: 0,
      };
      groups.set(key, group);
    }
    tally(group, q);
  }

  const subjects = [...groups.values()].map((g) => {
    const attempted = g.correct + g.wrong;
    return { ...g, accuracy: attempted === 0 ? 0 : Math.round((g.correct / attempted) * 100) };
  });

  if (subjects.length < 2) {
    return { subjects, weakest: null, strongest: null };
  }

  const byAccuracy = subjects.slice().sort((a, b) => a.accuracy - b.accuracy);
  return {
    subjects,
    weakest: byAccuracy[0] ?? null,
    strongest: byAccuracy[byAccuracy.length - 1] ?? null,
  };
}

function tally(group: SubjectBreakdown, q: ResultQuestion): void {
  group.total += 1;
  group.possible += q.marks;
  switch (q.outcome) {
    case 'correct':
      group.correct += 1;
      group.scored += q.marks;
      break;
    case 'wrong':
      group.wrong += 1;
      group.scored -= q.negativeMarks;
      break;
    case 'unattempted':
      group.skipped += 1;
      break;
  }
}

/**
 * Flattens question text for places that cannot render it — the PDF report.
 * Mirrors the markers RichText understands: `$...$` is turned into readable
 * plain text by `texToText`, and a figure marker becomes a note that a
 * diagram sat there, since the PDF does not embed images.
 */
export function toPlainText(raw: string): string {
  return raw
    .replace(/\$([^$]*)\$/g, (_, tex: string) => texToText(tex))
    .replace(/\[figure:[^\]]*\]/g, '[diagram]')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A deliberately small TeX-to-text pass for the handful of constructs the
 * question bank actually uses. The PDF's built-in font only has Latin-1
 * glyphs, so it can show ° × ± ² ³ but not √ or Greek — those become words
 * ("sqrt", "omega"), which is still clearer than a backslash command.
 */
const SYMBOLS: Record<string, string> = {
  times: '×',
  cdot: '·',
  pm: '±',
  div: '÷',
  circ: '°',
  degree: '°',
  rightarrow: '->',
  to: '->',
  leftarrow: '<-',
  infty: 'infinity',
  approx: '≈',
  neq: '≠',
  ne: '≠',
  leq: '<=',
  le: '<=',
  geq: '>=',
  ge: '>=',
};

const SUPERSCRIPTS: Record<string, string> = { '1': '¹', '2': '²', '3': '³' };

function texToText(tex: string): string {
  let out = tex;
  // Structural commands first, innermost-first so nested braces unwind.
  for (let i = 0; i < 5; i += 1) {
    out = out
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
      .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
      .replace(/\\(?:text|mathrm|mathbf|textbf|mathit|operatorname)\{([^{}]*)\}/g, '$1');
  }
  out = out
    .replace(/\^\\circ/g, '°')
    .replace(/\\left|\\right/g, '')
    .replace(/\\[,;:!]|\\ /g, ' ')
    .replace(/\\([a-zA-Z]+)/g, (_, name: string) => SYMBOLS[name] ?? name)
    // Superscripts: ² ³ where the font has them, ^n otherwise. Subscripts
    // just lose their marker (E_0 -> E0), which is how people type them.
    .replace(/\^\{([^{}]*)\}/g, (_, v: string) => SUPERSCRIPTS[v] ?? `^${v}`)
    .replace(/\^([0-9a-zA-Z])/g, (_, v: string) => SUPERSCRIPTS[v] ?? `^${v}`)
    .replace(/_\{([^{}]*)\}/g, '$1')
    .replace(/_([0-9a-zA-Z])/g, '$1')
    .replace(/[{}]/g, '')
    // "61° C" reads better as "61°C".
    .replace(/° ?C\b/g, '°C');
  return out;
}
