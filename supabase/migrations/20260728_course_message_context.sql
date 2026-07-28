ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS course_id bigint REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_participants_course_created_idx
  ON public.messages(sender_id, recipient_id, course_id, created_at DESC);
