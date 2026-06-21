-- Add streak tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_date date;

-- Lesson notes: one note per user per lesson, auto-saved
CREATE TABLE IF NOT EXISTS lesson_notes (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id bigint references lessons(id) on delete cascade not null,
  note text default '',
  updated_at timestamptz default now(),
  unique(user_id, lesson_id)
);

ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notes"
  ON lesson_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
