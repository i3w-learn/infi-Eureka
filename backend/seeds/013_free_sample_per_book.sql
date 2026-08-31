-- Every book opens on something readable.
--
-- One free sample per kind left four of the six books completely locked: ten
-- Chemistry covers with a padlock on each and no way to see what is behind
-- them. The pitch of a free sample is "read this one, then decide", and it
-- only works if the book the student actually opened has one.
--
-- "First" is the document the student meets first, which is exactly the browse
-- order in LibraryDao: chapter number where there is one, title otherwise.
-- Chemistry gets real chapter numbers in migration 0013; Biology and Physics
-- formula sheets are topic lists with no chapter order at all, so there the
-- first by title is genuinely the first one on screen.
--
-- Safe to re-run: it clears the old flags before setting new ones.

UPDATE library_documents SET is_free_sample = FALSE WHERE is_free_sample;

UPDATE library_documents
   SET is_free_sample = TRUE
 WHERE id IN (
   SELECT DISTINCT ON (kind, subject, grade) id
     FROM library_documents
    ORDER BY kind, subject, grade, chapter_number NULLS LAST, title
 );
