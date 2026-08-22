-- Up Migration

-- CITEXT makes email comparisons case-insensitive at the database level, so
-- Asha@gmail.com and asha@gmail.com cannot become two accounts (DR-04).
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT        NOT NULL,
    email         CITEXT      NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    -- Set to true only by a verified payment. This column is the single source
    -- of truth for access; it is never read from a token.
    is_premium    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Down Migration

DROP TABLE users;
