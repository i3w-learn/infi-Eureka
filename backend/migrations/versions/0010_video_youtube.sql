-- Up Migration

-- Lectures play as an embedded YouTube player rather than streaming our own
-- copy: no bandwidth bill, no transcoding, and it works on a weak connection
-- because YouTube handles the quality switching.
--
-- This sits alongside file_path instead of replacing it. The downloaded mp4s
-- stay as the fallback for anything later pulled from YouTube, and the
-- one-source constraint has to be relaxed for that: a lecture may now have a
-- YouTube embed, a stored file, an external URL, or several — it only needs at
-- least one way to play.
ALTER TABLE videos ADD COLUMN youtube_url TEXT;

ALTER TABLE videos DROP CONSTRAINT videos_one_source;

ALTER TABLE videos
  ADD CONSTRAINT videos_has_a_source CHECK (
    file_path IS NOT NULL OR external_url IS NOT NULL OR youtube_url IS NOT NULL
  );

-- Down Migration

ALTER TABLE videos DROP CONSTRAINT videos_has_a_source;
DELETE FROM videos WHERE file_path IS NULL AND external_url IS NULL;
ALTER TABLE videos
  ADD CONSTRAINT videos_one_source CHECK (
    (file_path IS NOT NULL AND external_url IS NULL) OR
    (file_path IS NULL AND external_url IS NOT NULL)
  );
ALTER TABLE videos DROP COLUMN youtube_url;
