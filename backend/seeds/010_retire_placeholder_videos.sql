-- 002_videos.sql seeded four made-up lectures so the catalogue had something in
-- it before real content existed. Their mp4s were never on disk, so each one
-- lists fine and then fails the moment a student presses play. The real
-- lectures are now in 009_videos.sql, so the placeholders are retired here.
--
-- Removed by id rather than by "file missing", so this cannot delete a real
-- lecture whose file is temporarily absent (mid-download, or storage not
-- mounted). It runs after 002, which keeps a full re-seed clean.
--
-- The fifth placeholder, 'Sample Linked Lecture', is kept: it points at a real
-- external URL and still works as the external-source example.

DELETE FROM videos
 WHERE id IN (
   '10000000-0000-4000-8000-000000000001',  -- Human Physiology in One Shot
   '10000000-0000-4000-8000-000000000002',  -- Genetics & Evolution in One Shot
   '10000000-0000-4000-8000-000000000003',  -- Thermodynamics in One Shot
   '10000000-0000-4000-8000-000000000004'   -- Organic Chemistry Basics in One Shot
 );
