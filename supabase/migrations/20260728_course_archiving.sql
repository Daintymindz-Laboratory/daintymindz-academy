-- Courses are archived instead of being deleted so administrators can restore them.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS courses_archived_at_idx ON courses(archived_at);

