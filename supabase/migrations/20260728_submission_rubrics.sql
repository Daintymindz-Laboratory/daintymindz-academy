-- Configurable project rubrics and recorded grading results.
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS rubric_criteria jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE lesson_submissions
  ADD COLUMN IF NOT EXISTS acceptance_tests_passed integer,
  ADD COLUMN IF NOT EXISTS acceptance_tests_total integer,
  ADD COLUMN IF NOT EXISTS rubric_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS final_score numeric(6,2),
  ADD COLUMN IF NOT EXISTS grading_decision text
    CHECK (grading_decision IS NULL OR grading_decision IN ('pass', 'revise', 'not_yet'));

