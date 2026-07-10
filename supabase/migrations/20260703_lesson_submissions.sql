ALTER TABLE lessons ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS lesson_submissions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  submission_url text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  feedback text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_submissions_user_lesson_idx
  ON lesson_submissions(user_id, lesson_id, created_at DESC);

ALTER TABLE lesson_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own lesson submissions"
  ON lesson_submissions FOR SELECT USING (auth.uid() = user_id);

-- status is forced to 'pending' at the RLS layer, not just the client,
-- so a crafted insert can never self-approve.
CREATE POLICY "users insert own pending lesson submissions"
  ON lesson_submissions FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "admins manage lesson submissions"
  ON lesson_submissions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
