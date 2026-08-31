-- Up Migration

-- One free sample per KIND meant one free sheet across every formula-sheet
-- book there is. A student who opened Class 11 Chemistry found ten locked
-- covers and nothing to read, because the single free sheet lived in Biology.
-- A shelf sells itself by letting the reader open something, so the unit that
-- owns a free sample is the book — kind, subject and grade together.
DROP INDEX library_documents_one_free_per_kind_idx;

CREATE UNIQUE INDEX library_documents_one_free_per_book_idx
    ON library_documents (kind, subject, grade) WHERE is_free_sample;

-- Chemistry sheets carry their chapter number in the title ("G11-Ch1 …") and
-- nowhere else, so the browse order fell back to sorting by title: Ch1, Ch10,
-- Ch2, Ch3. Lifting the number into the column it belongs in puts the book in
-- reading order and makes "the first chapter" a fact rather than a guess.
UPDATE library_documents
   SET chapter_number = (regexp_match(title, '^G1[12]-Ch([0-9]+)'))[1]::INTEGER
 WHERE kind = 'formula_sheet'
   AND chapter_number IS NULL
   AND title ~ '^G1[12]-Ch[0-9]+';

-- Down Migration

-- Collapsing back to one free sample per kind: keep the lowest-ordered book's
-- sample and clear the rest, or the old unique index cannot be rebuilt.
UPDATE library_documents SET is_free_sample = FALSE
 WHERE is_free_sample
   AND id NOT IN (
     SELECT DISTINCT ON (kind) id
       FROM library_documents
      WHERE is_free_sample
      ORDER BY kind, subject, grade, chapter_number NULLS LAST, title
   );

UPDATE library_documents
   SET chapter_number = NULL
 WHERE kind = 'formula_sheet'
   AND title ~ '^G1[12]-Ch[0-9]+';

DROP INDEX library_documents_one_free_per_book_idx;

CREATE UNIQUE INDEX library_documents_one_free_per_kind_idx
    ON library_documents (kind) WHERE is_free_sample;
