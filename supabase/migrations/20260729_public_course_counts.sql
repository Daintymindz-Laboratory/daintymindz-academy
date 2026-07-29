DROP POLICY IF EXISTS "Public can view active courses" ON public.courses;

CREATE POLICY "Public can view active courses"
  ON public.courses FOR SELECT
  TO anon
  USING (archived_at IS NULL);
