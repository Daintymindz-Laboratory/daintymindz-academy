-- Documents the schema that shipped in commit 077189d ("feat: project
-- submission and instructor grading workflow"). That commit's DDL only
-- existed in the commit message, not as a migration file, so this file
-- exists purely to capture what's already live and keep supabase/migrations/
-- a complete record. No behavior change.

CREATE TABLE IF NOT EXISTS project_submissions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  lesson_id bigint not null,
  course_id bigint not null,
  lesson_type text not null,
  submitted_code text,
  notes text,
  status text not null default 'pending',
  feedback text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users
);

ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions: own insert" ON project_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "submissions: own read" ON project_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "submissions: admin read all" ON project_submissions FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "submissions: admin update" ON project_submissions FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
