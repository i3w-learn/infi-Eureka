-- A video that lives on an external host: only its link is stored. The URL
-- here is a public sample file so playback can be tested end to end today;
-- replace with the real lecture links as they arrive (or add them over the
-- API: POST /videos with the X-Admin-Key header).

INSERT INTO videos (id, title, subject, chapter, external_url, duration_seconds, mime_type)
VALUES
  ('10000000-0000-4000-8000-000000000005', 'Sample Linked Lecture (external host)', 'physics', 'Demo',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 596, 'video/mp4')
ON CONFLICT (id) DO NOTHING;
