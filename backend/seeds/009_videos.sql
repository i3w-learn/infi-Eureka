-- The one-shot lecture catalogue, generated from backend/data/videos.json.
-- Do not hand-edit; re-run the generator instead.
--
-- 27 lectures whose file is present in storage/. Entries still
-- downloading or waiting on Google Drive are deliberately left out — a row
-- with no file behind it breaks on play rather than on load.

INSERT INTO videos
  (id, title, subject, chapter, file_path, duration_seconds, mime_type,
   size_bytes, grade, educator_name)
VALUES
  ('34000000-0000-4000-8000-000000000001', 'Ecosystem — one shot', 'botany', 'Ecosystem',
   'videos/botany-ecosystem.mp4', 5573, 'video/mp4', 1074008046, 12, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000002', 'Organism & Population — one shot', 'botany', 'Organism & Population',
   'videos/botany-organism-population.mp4', 6989, 'video/mp4', 1190192962, 12, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000003', 'Microbes in Human Welfare — one shot', 'botany', 'Microbes in Human Welfare',
   'videos/botany-microbes-in-human-welfare.mp4', 7518, 'video/mp4', 592949940, 12, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000004', 'Molecular Basis of Inheritance — one shot', 'botany', 'Molecular Basis of Inheritance',
   'videos/botany-molecular-basis-of-inheritance.mp4', 19646, 'video/mp4', 3000158454, 12, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000005', 'Principles of Inheritance — one shot', 'botany', 'Principles of Inheritance',
   'videos/botany-principles-of-inheritance.mp4', 12499, 'video/mp4', 1617903590, 12, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000006', 'Sexual Reproduction in Flowering Plants — one shot', 'botany', 'Sexual Reproduction in Flowering Plants',
   'videos/botany-sexual-reproduction-in-flowering-plants.mp4', 13655, 'video/mp4', 946831328, 12, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000007', 'Biomolecules — one shot', 'botany', 'Biomolecules',
   'videos/botany-biomolecules.mp4', 6474, 'video/mp4', 517700859, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000008', 'Cell Cycle & Cell Division — one shot', 'botany', 'Cell Cycle & Cell Division',
   'videos/botany-cell-cycle-and-cell-division.mp4', 4516, 'video/mp4', 478330251, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000009', 'Cell : The Unit of Life — one shot', 'botany', 'Cell : The Unit of Life',
   'videos/botany-cell-the-unit-of-life.mp4', 8290, 'video/mp4', 903283320, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000010', 'Plant Growth & Development — one shot', 'botany', 'Plant Growth & Development',
   'videos/botany-plant-growth-and-development.mp4', 5072, 'video/mp4', 695138998, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000011', 'Respiration in Plants — one shot', 'botany', 'Respiration in Plants',
   'videos/botany-respiration-in-plants.mp4', 5775, 'video/mp4', 438156497, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000012', 'Photosynthesis in Higher Plants — one shot', 'botany', 'Photosynthesis in Higher Plants',
   'videos/botany-photosynthesis-in-higher-plants.mp4', 9571, 'video/mp4', 1122948688, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000013', 'Anatomy of Flowering Plants — one shot', 'botany', 'Anatomy of Flowering Plants',
   'videos/botany-anatomy-of-flowering-plants.mp4', 7320, 'video/mp4', 926109766, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000014', 'Morphology of Flowering Plants — one shot', 'botany', 'Morphology of Flowering Plants',
   'videos/botany-morphology-of-flowering-plants.mp4', 9255, 'video/mp4', 1002367894, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000015', 'Plant Kingdom — one shot', 'botany', 'Plant Kingdom',
   'videos/botany-plant-kingdom.mp4', 7674, 'video/mp4', 778699211, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000016', 'Biological Classification — one shot', 'botany', 'Biological Classification',
   'videos/botany-biological-classification.mp4', 10542, 'video/mp4', 734867216, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000017', 'The Living World — one shot', 'botany', 'The Living World',
   'videos/botany-the-living-world.mp4', 6942, 'video/mp4', 441680804, 11, 'Tamsa Ma''am'),
  ('34000000-0000-4000-8000-000000000018', 'Electric Charges & Field — one shot', 'physics', 'Electric Charges & Field',
   'videos/physics-electric-charges-and-field.mp4', 19689, 'video/mp4', 1165903530, NULL, 'Tushar Patel Sir'),
  ('34000000-0000-4000-8000-000000000019', 'Electrostatics — one shot', 'physics', 'Electrostatics',
   'videos/physics-electrostatics.mp4', 13907, 'video/mp4', 985537800, NULL, 'Tushar Patel Sir'),
  ('34000000-0000-4000-8000-000000000020', 'Current Electricity — one shot', 'physics', 'Current Electricity',
   'videos/physics-current-electricity.mp4', 9852, 'video/mp4', 652120618, NULL, 'Tushar Patel Sir'),
  ('34000000-0000-4000-8000-000000000021', 'Moving Charges + Magnetism & Matter — one shot', 'physics', 'Moving Charges + Magnetism & Matter',
   'videos/physics-moving-charges-and-magnetism.mp4', 10723, 'video/mp4', 708589940, NULL, 'Tushar Patel Sir'),
  ('34000000-0000-4000-8000-000000000022', 'Units & Measurement — one shot', 'physics', 'Units & Measurement',
   'videos/physics-units-and-measurement.mp4', 7825, 'video/mp4', 606149638, 11, 'Tushar Patel Sir'),
  ('34000000-0000-4000-8000-000000000023', 'Laws of Motion — one shot', 'physics', 'Laws of Motion',
   'videos/physics-laws-of-motion.mp4', 5654, 'video/mp4', 361778533, 11, 'Tushar Patel Sir'),
  ('34000000-0000-4000-8000-000000000024', 'Units & Measurement — supershot', 'physics', 'Units & Measurement supershot',
   'videos/physics-units-and-measurement-supershot.mp4', 3700, 'video/mp4', 687085215, NULL, 'Tushar Patel Sir'),
  ('34000000-0000-4000-8000-000000000025', 'Alcohol, Phenol & Ether — one shot', 'chemistry', 'Alcohol, Phenol & Ether',
   'videos/chemistry-alcohol-phenol-and-ether.mp4', 16668, 'video/mp4', 1511698000, NULL, 'Sanjay Arya Sir'),
  ('34000000-0000-4000-8000-000000000026', 'Haloalkanes & Haloarenes — one shot', 'chemistry', 'Haloalkanes & Haloarenes',
   'videos/chemistry-haloalkanes-and-haloarenes.mp4', 14625, 'video/mp4', 1395897151, NULL, 'Sanjay Arya Sir'),
  ('34000000-0000-4000-8000-000000000027', 'Coordination Compounds — one shot', 'chemistry', 'Coordination Compounds',
   'videos/chemistry-coordination-compounds.mp4', 16272, 'video/mp4', 1560064992, NULL, 'Sanjay Arya Sir')
ON CONFLICT (id) DO NOTHING;

-- The free lecture. Cleared first because only one may carry the flag.
UPDATE videos SET is_free_sample = FALSE WHERE is_free_sample;
UPDATE videos SET is_free_sample = TRUE WHERE chapter = 'The Living World';
