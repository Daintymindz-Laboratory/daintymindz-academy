DROP POLICY IF EXISTS "Anyone can read tracks" ON public.tracks;

CREATE POLICY "Anyone can read tracks"
  ON public.tracks FOR SELECT
  TO anon, authenticated
  USING (true);
