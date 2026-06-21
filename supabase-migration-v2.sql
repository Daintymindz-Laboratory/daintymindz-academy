-- Daintymindz Academy: Schema v2 migration
-- Run this entire file in: Supabase Dashboard > SQL Editor > New query

-- ── Quiz questions (for quiz lesson type) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_questions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lesson_id bigint NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice'
    CHECK (question_type IN ('multiple_choice', 'code_output')),
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer text NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Per-user quiz scores ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_scores (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  score integer NOT NULL,
  total integer NOT NULL,
  passed boolean NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

-- ── Test cases (for mini_project lesson type) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS mini_project_test_cases (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lesson_id bigint NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  test_code text NOT NULL,
  expected_output text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Per-user mini project results (upsert) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS mini_project_results (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  all_passed boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 1,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_project_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_project_results ENABLE ROW LEVEL SECURITY;

-- quiz_questions: enrolled students read, admins manage
CREATE POLICY "enrolled students read quiz questions"
  ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN lessons l ON l.id = quiz_questions.lesson_id
      WHERE e.user_id = auth.uid() AND e.course_id = l.course_id
    )
  );

CREATE POLICY "admins manage quiz questions"
  ON quiz_questions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- quiz_scores: own read/insert, admin read all
CREATE POLICY "users read own quiz scores"
  ON quiz_scores FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users insert own quiz scores"
  ON quiz_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins read all quiz scores"
  ON quiz_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- mini_project_test_cases: enrolled students read, admins manage
CREATE POLICY "enrolled students read test cases"
  ON mini_project_test_cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN lessons l ON l.id = mini_project_test_cases.lesson_id
      WHERE e.user_id = auth.uid() AND e.course_id = l.course_id
    )
  );

CREATE POLICY "admins manage test cases"
  ON mini_project_test_cases FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- mini_project_results: own read/insert/update, admin read all
CREATE POLICY "users read own mini project results"
  ON mini_project_results FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users insert own mini project results"
  ON mini_project_results FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own mini project results"
  ON mini_project_results FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "admins read all mini project results"
  ON mini_project_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
