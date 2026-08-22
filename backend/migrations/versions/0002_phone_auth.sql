-- Up Migration

-- Auth is phone + OTP (matching the production auth schema), so the
-- email/password columns become optional and the profile fields arrive.
ALTER TABLE users
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD COLUMN phone TEXT UNIQUE,
  ADD COLUMN date_of_birth DATE,
  ADD COLUMN class TEXT,
  ADD COLUMN subjects TEXT[],
  ADD COLUMN goals TEXT[],
  ADD COLUMN learning_preference TEXT[];

-- One row per OTP sent. The code itself is stored hashed, like a password.
CREATE TABLE otp_challenges (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           TEXT        NOT NULL,
    otp_hash        TEXT        NOT NULL,
    challenge_token UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    -- Wrong guesses; the challenge dies after 5 so codes cannot be brute-forced.
    attempts        INT         NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX otp_challenges_expires_idx ON otp_challenges (expires_at);

-- Down Migration

DROP TABLE otp_challenges;
ALTER TABLE users
  DROP COLUMN phone,
  DROP COLUMN date_of_birth,
  DROP COLUMN class,
  DROP COLUMN subjects,
  DROP COLUMN goals,
  DROP COLUMN learning_preference;
