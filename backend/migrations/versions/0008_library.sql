-- Up Migration

-- Study material that is a PDF on an external host: formula sheets and NCERT
-- Highlights. Both are "subject + class + one PDF per chapter", so they share
-- one table with a `kind` discriminator rather than two identical ones — a
-- third PDF type later is a new enum value, not a new DAO/service/route stack.
--
-- Only the URL is stored. The files live in GCS and never touch Postgres.

CREATE TABLE library_documents (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    kind           TEXT        NOT NULL CHECK (kind IN ('formula_sheet', 'ncert_highlight')),
    slug           TEXT        NOT NULL,
    title          TEXT        NOT NULL,
    subject        TEXT        NOT NULL,
    -- NEET is classes 11 and 12; the check keeps stray grades out at the door.
    grade          INT         NOT NULL CHECK (grade IN (11, 12)),
    -- Printed chapter number where the source has one. Formula sheets do not.
    chapter_number INT,
    url            TEXT        NOT NULL,
    size_bytes     BIGINT      NOT NULL DEFAULT 0,
    -- Open to any signed-in student, paid or not (one per kind).
    is_free_sample BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (kind, slug)
);

CREATE INDEX library_documents_browse_idx ON library_documents (kind, subject, grade);

-- At most one free sample per kind, enforced by the database rather than by
-- remembering to unset the old one.
CREATE UNIQUE INDEX library_documents_one_free_per_kind_idx
    ON library_documents (kind)
    WHERE is_free_sample;

-- Down Migration

DROP TABLE library_documents;
