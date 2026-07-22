-- Allow a course to have multiple ordered certificate signatories.
-- created_by remains the primary instructor for backwards compatibility.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS instructor_ids uuid[] NOT NULL DEFAULT '{}';

UPDATE courses
SET instructor_ids = ARRAY[created_by]
WHERE created_by IS NOT NULL
  AND cardinality(instructor_ids) = 0;
