-- Up Migration

-- A YouTube video can be marked "no playback on other websites" by its owner,
-- and an embed of one renders as YouTube's "Video unavailable" card. Most of
-- our live-stream lectures are marked that way.
--
-- Whether a video embeds is a fact about the video, checked against YouTube and
-- stored, rather than something the player can discover: the iframe fails
-- silently from our side, so there is nothing to catch at render time. The
-- player reads this to decide between the embed and our own copy of the file.
--
-- Defaults to FALSE so a newly added lecture is streamed from storage — which
-- always works — until a check confirms the embed is allowed.
ALTER TABLE videos ADD COLUMN is_embeddable BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN videos.is_embeddable IS
  'YouTube allows this video to play inside an iframe on our site. Set by scripts/check-embeddable.js.';

-- Down Migration

ALTER TABLE videos DROP COLUMN is_embeddable;
