-- Up Migration

-- Phase 5: CBT mock tests.

CREATE TABLE tests (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT        NOT NULL,
    subject          TEXT        NOT NULL,
    duration_minutes INT         NOT NULL CHECK (duration_minutes > 0),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- correct_option lives here and NEVER travels to a live attempt (DR-06):
-- the DAO has separate queries for "questions to show" and "answer key".
-- Marks are per-question (FR-T-13): NEET is +4 correct, -1 wrong.
CREATE TABLE questions (
    id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id        UUID    NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
    position       INT     NOT NULL,
    question_text  TEXT    NOT NULL,
    option_a       TEXT    NOT NULL,
    option_b       TEXT    NOT NULL,
    option_c       TEXT    NOT NULL,
    option_d       TEXT    NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    marks          INT     NOT NULL DEFAULT 4,
    negative_marks INT     NOT NULL DEFAULT 1,
    UNIQUE (test_id, position)
);

CREATE TABLE attempts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    test_id      UUID        NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Server-computed deadline (FR-T-02). The browser clock never matters.
    expires_at   TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    score        INT
);

-- At most one in-progress attempt per student per test (FR-T-04).
CREATE UNIQUE INDEX attempts_one_in_progress_idx
    ON attempts (user_id, test_id)
    WHERE submitted_at IS NULL;

-- One row per question the student has touched. The primary key is what makes
-- "saving twice overwrites, never duplicates" (FR-T-06) a database guarantee.
CREATE TABLE attempt_answers (
    attempt_id        UUID        NOT NULL REFERENCES attempts (id) ON DELETE CASCADE,
    question_id       UUID        NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    chosen_option     CHAR(1)     CHECK (chosen_option IN ('A', 'B', 'C', 'D')),
    marked_for_review BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (attempt_id, question_id)
);

-- Down Migration

DROP TABLE attempt_answers;
DROP TABLE attempts;
DROP TABLE questions;
DROP TABLE tests;
