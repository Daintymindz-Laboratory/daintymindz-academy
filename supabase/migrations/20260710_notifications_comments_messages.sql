-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  type text not null,
  title text not null,
  message text not null,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications: own read"   ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications: own update" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications: any insert" ON notifications FOR INSERT WITH CHECK (true);

-- Course comments (threaded, public to enrolled students)
CREATE TABLE IF NOT EXISTS course_comments (
  id bigint generated always as identity primary key,
  course_id bigint references courses(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  parent_id bigint references course_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
ALTER TABLE course_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments: enrolled read" ON course_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE user_id = auth.uid() AND course_id = course_comments.course_id)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "comments: enrolled insert" ON course_comments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (SELECT 1 FROM enrollments WHERE user_id = auth.uid() AND course_id = course_comments.course_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
);
CREATE POLICY "comments: own delete" ON course_comments FOR DELETE USING (auth.uid() = user_id);

-- Direct messages (student <-> instructor)
CREATE TABLE IF NOT EXISTS messages (
  id bigint generated always as identity primary key,
  sender_id uuid references auth.users not null,
  recipient_id uuid references auth.users not null,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages: participants read" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "messages: own send"          ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages: recipient update"  ON messages FOR UPDATE USING (auth.uid() = recipient_id);
