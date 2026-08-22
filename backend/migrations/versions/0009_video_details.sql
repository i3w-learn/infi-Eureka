-- Up Migration

-- The real lecture catalogue carries three things the table had no room for.
-- Grade and educator are what a student actually scans for when choosing a
-- one-shot; the free-sample flag gives videos the same taste-before-you-pay
-- rule that tests and library documents already have.
ALTER TABLE videos
  ADD COLUMN grade         INT,
  ADD COLUMN educator_name TEXT,
  ADD COLUMN is_free_sample BOOLEAN NOT NULL DEFAULT FALSE;

-- Grade is 11 or 12 where known; a supershot spanning both leaves it NULL.
ALTER TABLE videos
  ADD CONSTRAINT videos_grade_check CHECK (grade IS NULL OR grade IN (11, 12));

-- One free video at a time, matching tests and the library.
CREATE UNIQUE INDEX videos_one_free_sample_idx ON videos (is_free_sample) WHERE is_free_sample;

-- Down Migration

DROP INDEX videos_one_free_sample_idx;
ALTER TABLE videos
  DROP CONSTRAINT videos_grade_check,
  DROP COLUMN is_free_sample,
  DROP COLUMN educator_name,
  DROP COLUMN grade;
