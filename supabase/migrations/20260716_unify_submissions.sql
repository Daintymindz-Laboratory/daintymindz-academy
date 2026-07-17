-- ============================================================
-- Unify the two duplicated submission/review systems into one
-- `submissions` table.  Run once in the Supabase SQL Editor
-- (there is no CLI migration runner in this project).
--
-- Consolidates:
--   * lesson_submissions  (link + note, status pending/approved/rejected)
--   * project_submissions (code + notes, status pending/approved/rework)
-- into a single table with a `kind` discriminator ('link' | 'code') and a
-- unified status vocabulary (pending / approved / changes_requested).
--
-- This is the EXPAND step of an expand -> cut-over -> contract rollout:
-- it creates the new table and backfills both old tables, but leaves the
-- old tables in place.  The old tables are renamed/dropped later, by
-- 20260717_drop_old_submission_tables.sql, only after the new code is
-- deployed and verified.
--
-- BEFORE running, inspect for dirty legacy data (project_submissions never
-- had a status CHECK and submitted_code is nullable):
--   SELECT DISTINCT status FROM project_submissions;
--   SELECT count(*) FROM project_submissions WHERE submitted_code IS NULL;
-- ============================================================

-- ── 1. Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id             bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id        uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id      bigint NOT NULL REFERENCES lessons(id)    ON DELETE CASCADE,
  course_id      bigint NOT NULL REFERENCES courses(id)    ON DELETE CASCADE,
  kind           text   NOT NULL CHECK (kind IN ('link', 'code')),
  lesson_type    text   NOT NULL,
  submission_url text,
  submitted_code text,
  note           text,
  status         text   NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'changes_requested')),
  feedback       text,
  reviewed_by    uuid   REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  -- A link submission must carry a URL; a code submission must carry code.
  CONSTRAINT submissions_content_present CHECK (
    (kind = 'link' AND submission_url IS NOT NULL)
    OR (kind = 'code' AND submitted_code IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS submissions_user_lesson_idx
  ON submissions(user_id, lesson_id, created_at DESC);
-- Serves the admin pending list + sidebar badge (roughly 2x volume now).
CREATE INDEX IF NOT EXISTS submissions_pending_idx
  ON submissions(status) WHERE status = 'pending';

-- ── 2. RLS (mirrors the stricter lesson_submissions policies) ─
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own submissions" ON submissions;
CREATE POLICY "users read own submissions"
  ON submissions FOR SELECT USING (auth.uid() = user_id);

-- status is pinned to 'pending' at the RLS layer, so a crafted insert can
-- never self-approve.
DROP POLICY IF EXISTS "users insert own pending submissions" ON submissions;
CREATE POLICY "users insert own pending submissions"
  ON submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "admins manage submissions" ON submissions;
CREATE POLICY "admins manage submissions"
  ON submissions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ── 3. Backfill (guarded: only runs while `submissions` is empty, so
--        re-running this file is a no-op rather than a duplicate insert) ──
DO $$
BEGIN
  IF (SELECT count(*) FROM submissions) > 0 THEN
    RAISE NOTICE 'submissions already populated (% rows) — skipping backfill',
      (SELECT count(*) FROM submissions);
    RETURN;
  END IF;

  -- 3a. lesson_submissions -> kind='link'.
  -- course_id / lesson_type are not stored on lesson_submissions, so derive
  -- them from lessons.  The lesson_id FK cascades, so there are no orphans.
  INSERT INTO submissions
    (user_id, lesson_id, course_id, kind, lesson_type, submission_url, note,
     status, feedback, reviewed_by, reviewed_at, created_at)
  SELECT
    ls.user_id, ls.lesson_id, l.course_id, 'link', l.type, ls.submission_url, ls.note,
    CASE ls.status WHEN 'rejected' THEN 'changes_requested' ELSE ls.status END,
    ls.feedback, ls.reviewed_by, ls.reviewed_at, ls.created_at
  FROM lesson_submissions ls
  JOIN lessons l ON l.id = ls.lesson_id;

  -- 3b. project_submissions -> kind='code'.
  -- Uses B's stored course_id/lesson_type (B has no lesson FK — a join could
  -- silently drop orphans).  Rows whose lesson/course no longer exist are
  -- skipped (they would violate the new FKs anyway) — check the count delta.
  --   * note        := notes
  --   * created_at   := submitted_at
  --   * status       : rework -> changes_requested; any other non-standard
  --                    value also folds to changes_requested (never silently
  --                    to 'approved')
  --   * submitted_code: coalesced to '' so a legacy NULL row still migrates
  --                    past the content CHECK instead of being lost
  --   * reviewed_by  : scalar lookup against profiles nulls out any reviewer
  --                    that has no profile row (B referenced auth.users)
  INSERT INTO submissions
    (user_id, lesson_id, course_id, kind, lesson_type, submitted_code, note,
     status, feedback, reviewed_by, reviewed_at, created_at)
  SELECT
    ps.user_id, ps.lesson_id, ps.course_id, 'code', ps.lesson_type,
    coalesce(ps.submitted_code, ''), ps.notes,
    CASE ps.status WHEN 'pending' THEN 'pending' WHEN 'approved' THEN 'approved'
                   ELSE 'changes_requested' END,
    ps.feedback,
    (SELECT p.id FROM profiles p WHERE p.id = ps.reviewed_by),
    ps.reviewed_at, ps.submitted_at
  FROM project_submissions ps
  WHERE EXISTS (SELECT 1 FROM lessons l WHERE l.id = ps.lesson_id)
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = ps.course_id);

  RAISE NOTICE 'Backfill complete: % rows in submissions (lesson_submissions=%, project_submissions=%)',
    (SELECT count(*) FROM submissions),
    (SELECT count(*) FROM lesson_submissions),
    (SELECT count(*) FROM project_submissions);
END $$;

-- ── 4. Verify by hand after running ──────────────────────────
--   SELECT count(*) FROM submissions;                       -- expect A + B (minus skipped orphans)
--   SELECT count(*) FROM lesson_submissions;                -- A
--   SELECT count(*) FROM project_submissions;               -- B
--   SELECT kind, status, count(*) FROM submissions GROUP BY 1, 2 ORDER BY 1, 2;
--   -- orphaned project_submissions rows that were skipped:
--   SELECT count(*) FROM project_submissions ps
--     WHERE NOT EXISTS (SELECT 1 FROM lessons  l WHERE l.id = ps.lesson_id)
--        OR NOT EXISTS (SELECT 1 FROM courses  c WHERE c.id = ps.course_id);
