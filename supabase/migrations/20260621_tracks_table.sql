CREATE TABLE IF NOT EXISTS tracks (
  code text primary key,
  label text not null,
  color text not null default '#6B7280',
  created_at timestamptz default now()
);

INSERT INTO tracks (code, label, color) VALUES
  ('AI', 'Artificial Intelligence', '#D59C10'),
  ('DA', 'Data Analytics', '#4E8FD4'),
  ('SE', 'Software Engineering', '#4CAF7D'),
  ('DO', 'Data Operations', '#9B6FD4')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tracks"
  ON tracks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage tracks"
  ON tracks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
