ALTER TABLE course_comments
  ADD COLUMN IF NOT EXISTS lesson_id bigint REFERENCES lessons(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS course_comments_lesson_created_idx
  ON course_comments(lesson_id, created_at);

CREATE OR REPLACE FUNCTION public.get_lesson_discussion_comments(p_lesson_id bigint)
RETURNS TABLE (
  id bigint,
  user_id uuid,
  parent_id bigint,
  content text,
  created_at timestamptz,
  author_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT comment.id, comment.user_id, comment.parent_id, comment.content,
         comment.created_at, COALESCE(profile.full_name, 'Learner')
  FROM course_comments comment
  LEFT JOIN profiles profile ON profile.id = comment.user_id
  WHERE comment.lesson_id = p_lesson_id
    AND (
      EXISTS (
        SELECT 1 FROM lessons lesson
        JOIN enrollments enrollment ON enrollment.course_id = lesson.course_id
        WHERE lesson.id = p_lesson_id AND enrollment.user_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM profiles viewer WHERE viewer.id = auth.uid() AND viewer.is_admin = true)
    )
  ORDER BY comment.created_at;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_discussion_comments(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lesson_discussion_comments(bigint) TO authenticated;

NOTIFY pgrst, 'reload schema';
