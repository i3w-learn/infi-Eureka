-- Up Migration

-- Phase 3 + 4 content: videos, notes, and per-user highlights.
-- Video FILES live in storage (FR-V-03); this table holds only metadata.

CREATE TABLE videos (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT        NOT NULL,
    subject          TEXT        NOT NULL,
    chapter          TEXT        NOT NULL,
    -- Key inside the storage driver (a relative path for local disk), never bytes.
    file_path        TEXT        NOT NULL,
    thumbnail_url    TEXT,
    duration_seconds INT         NOT NULL DEFAULT 0,
    mime_type        TEXT        NOT NULL DEFAULT 'video/mp4',
    size_bytes       BIGINT      NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX videos_subject_idx ON videos (subject);

CREATE TABLE notes (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT        NOT NULL,
    subject      TEXT        NOT NULL,
    chapter      TEXT        NOT NULL,
    content_html TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notes_subject_idx ON notes (subject);

-- Each user's highlights are their own (FR-N-06). Offsets are character
-- positions into the note's text so the exact selection can be re-applied.
CREATE TABLE highlights (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    note_id          UUID        NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
    highlighted_text TEXT        NOT NULL,
    start_offset     INT         NOT NULL CHECK (start_offset >= 0),
    end_offset       INT         NOT NULL CHECK (end_offset > start_offset),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX highlights_user_note_idx ON highlights (user_id, note_id);

-- Down Migration

DROP TABLE highlights;
DROP TABLE notes;
DROP TABLE videos;
