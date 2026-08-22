-- Up Migration

-- A locked student still gets one real taste of each thing we sell. The flag
-- lives on the row rather than being "whichever is oldest", so which test is
-- free is a deliberate choice we can move without a deploy.
ALTER TABLE tests ADD COLUMN is_free_sample BOOLEAN NOT NULL DEFAULT FALSE;

-- At most one free test at a time — the offer is a taste, not a tier.
CREATE UNIQUE INDEX tests_one_free_sample_idx ON tests (is_free_sample) WHERE is_free_sample;

-- Down Migration

DROP INDEX tests_one_free_sample_idx;
ALTER TABLE tests DROP COLUMN is_free_sample;
