-- Sample notes. content_html is sanitised again on the way out (NFR-S-10),
-- so even a bad seed cannot ship a script to the browser.

INSERT INTO notes (id, title, subject, chapter, content_html)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Cell: The Unit of Life — Quick Notes', 'biology', 'Cell Structure',
   '<h2>Cell: The Unit of Life</h2><p>All organisms are made of cells. <strong>Robert Hooke</strong> first described cells in 1665.</p><ul><li>Prokaryotic cells lack a membrane-bound nucleus.</li><li>Eukaryotic cells have membrane-bound organelles.</li><li>The plasma membrane is a <em>fluid mosaic</em> of lipids and proteins.</li></ul><p>Mitochondria are the site of aerobic respiration and have their own DNA.</p>'),
  ('20000000-0000-4000-8000-000000000002', 'Laws of Motion — Formula Sheet', 'physics', 'Laws of Motion',
   '<h2>Laws of Motion</h2><p><strong>Newton''s second law:</strong> F = ma.</p><ul><li>Momentum: p = mv</li><li>Impulse: J = F·Δt = Δp</li><li>Friction: f ≤ μN</li></ul><p>For a body on an incline of angle θ: N = mg·cosθ, and the sliding component is mg·sinθ.</p>'),
  ('20000000-0000-4000-8000-000000000003', 'Chemical Bonding — Key Concepts', 'chemistry', 'Chemical Bonding',
   '<h2>Chemical Bonding</h2><p>Atoms bond to attain a stable electronic configuration.</p><ul><li><strong>Ionic bond:</strong> electron transfer (NaCl).</li><li><strong>Covalent bond:</strong> electron sharing (H₂O).</li><li><strong>VSEPR:</strong> electron pairs arrange to minimise repulsion.</li></ul><p>Bond order in O₂ is 2; in N₂ it is 3, which is why N₂ is so inert.</p>')
ON CONFLICT (id) DO NOTHING;
