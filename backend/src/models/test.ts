export type Option = 'A' | 'B' | 'C' | 'D';

/** A row in the `tests` table. */
export interface TestRow {
  id: string;
  title: string;
  subject: string;
  duration_minutes: number;
  /** Open to any signed-in student, paid or not. At most one test is. */
  is_free_sample: boolean;
  created_at: string;
}

/** A test row joined with per-test aggregates, as the list endpoint needs. */
export interface TestListRow extends TestRow {
  question_count: number;
  total_marks: number;
}

/**
 * A question WITHOUT its answer — the only shape that may exist while an
 * attempt is live (DR-06).
 */
export interface QuestionRow {
  id: string;
  test_id: string;
  position: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
  negative_marks: number;
  /** Which NEET subject this question belongs to, e.g. 'Botany'. Null on
      papers seeded before the CBT screen needed subject tabs. */
  subject: string | null;
  /** 'A' (compulsory) or 'B' (attempt any 10). Null alongside `subject`. */
  section: 'A' | 'B' | null;
}

/** A question WITH its answer — only ever fetched for scoring and results. */
export interface QuestionWithAnswerRow extends QuestionRow {
  correct_option: Option;
}

/** A row in the `attempts` table. */
export interface AttemptRow {
  id: string;
  user_id: string;
  test_id: string;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  score: number | null;
}

/** A row in the `attempt_answers` table. */
export interface AttemptAnswerRow {
  attempt_id: string;
  question_id: string;
  chosen_option: Option | null;
  marked_for_review: boolean;
  updated_at: string;
}
