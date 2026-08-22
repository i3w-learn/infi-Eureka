-- Up Migration

-- The CBT screen groups a paper by subject tab (Botany / Zoology / Physics /
-- Chemistry) and splits each subject into NEET's Section A and Section B.
-- Neither fact was stored anywhere: `tests.subject` is a single value for the
-- whole paper ('mixed' on every full-length mock), so the question palette had
-- nothing to group by.
--
-- Both columns are nullable on purpose. A test seeded without this metadata
-- still renders — the client falls back to one flat, ungrouped list.
ALTER TABLE questions
    ADD COLUMN subject TEXT,
    ADD COLUMN section CHAR(1) CHECK (section IN ('A', 'B'));

-- The palette reads every question of a test at once, grouped and ordered.
CREATE INDEX questions_grouping_idx ON questions (test_id, subject, section, position);

-- Down Migration

DROP INDEX questions_grouping_idx;

ALTER TABLE questions
    DROP COLUMN section,
    DROP COLUMN subject;
