-- Sample one-shot video catalogue. The rows point at files under
-- backend/storage/videos/ — drop real .mp4 files there with these names (or
-- upload through POST /videos/upload) and streaming works immediately.

INSERT INTO videos (id, title, subject, chapter, file_path, thumbnail_url, duration_seconds, mime_type)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Human Physiology in One Shot', 'biology', 'Human Physiology',
   'videos/biology-human-physiology.mp4', NULL, 7200, 'video/mp4'),
  ('10000000-0000-4000-8000-000000000002', 'Genetics & Evolution in One Shot', 'biology', 'Genetics and Evolution',
   'videos/biology-genetics.mp4', NULL, 6300, 'video/mp4'),
  ('10000000-0000-4000-8000-000000000003', 'Thermodynamics in One Shot', 'physics', 'Thermodynamics',
   'videos/physics-thermodynamics.mp4', NULL, 5400, 'video/mp4'),
  ('10000000-0000-4000-8000-000000000004', 'Organic Chemistry Basics in One Shot', 'chemistry', 'Some Basic Principles of Organic Chemistry',
   'videos/chemistry-organic-basics.mp4', NULL, 8100, 'video/mp4')
ON CONFLICT (id) DO NOTHING;
