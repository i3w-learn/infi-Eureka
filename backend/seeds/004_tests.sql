-- One sample CBT mock test with five questions, NEET marking (+4 / -1).

INSERT INTO tests (id, title, subject, duration_minutes)
VALUES ('30000000-0000-4000-8000-000000000001', 'NEET Mini Mock — Mixed Practice', 'mixed', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions
  (id, test_id, position, question_text, option_a, option_b, option_c, option_d, correct_option, marks, negative_marks)
VALUES
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1,
   'Which organelle is known as the powerhouse of the cell?',
   'Ribosome', 'Mitochondrion', 'Golgi apparatus', 'Lysosome', 'B', 4, 1),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 2,
   'The SI unit of force is:',
   'Joule', 'Pascal', 'Newton', 'Watt', 'C', 4, 1),
  ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 3,
   'Which of the following has a bond order of 3?',
   'O₂', 'N₂', 'F₂', 'Ne₂', 'B', 4, 1),
  ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 4,
   'DNA replication is described as:',
   'Conservative', 'Dispersive', 'Semi-conservative', 'Non-conservative', 'C', 4, 1),
  ('31000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 5,
   'A body moving in a circle at constant speed has:',
   'Zero acceleration', 'Constant velocity', 'Acceleration towards the centre', 'Acceleration along the tangent', 'C', 4, 1)
ON CONFLICT (id) DO NOTHING;
