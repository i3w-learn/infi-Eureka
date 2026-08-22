-- Up Migration

-- Videos can now come from an external host (a link we are given) as well as
-- our own storage. Exactly one of the two sources must be set.

ALTER TABLE videos
  ALTER COLUMN file_path DROP NOT NULL,
  ADD COLUMN external_url TEXT,
  ADD CONSTRAINT videos_one_source CHECK (
    (file_path IS NOT NULL AND external_url IS NULL) OR
    (file_path IS NULL AND external_url IS NOT NULL)
  );

-- Down Migration

ALTER TABLE videos
  DROP CONSTRAINT videos_one_source,
  DROP COLUMN external_url;
DELETE FROM videos WHERE file_path IS NULL;
ALTER TABLE videos ALTER COLUMN file_path SET NOT NULL;
