-- ============================================================
-- Daintymindz Academy — Supabase RLS Policies
-- Run this in the Supabase SQL Editor (project dashboard > SQL)
-- ============================================================

-- Enable RLS on all tables (safe to run even if already enabled)
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates   ENABLE ROW LEVEL SECURITY;

-- ── Drop existing policies before recreating ─────────────────
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','courses','lessons','enrollments','progress','certificates')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── profiles ─────────────────────────────────────────────────
-- Users can read and update only their own profile
CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Admins can read all profiles (needed for Students tab in admin panel)
CREATE POLICY "profiles: admin read all"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true
  ));

-- ── courses ──────────────────────────────────────────────────
-- All authenticated users can read courses
CREATE POLICY "courses: authenticated read"
  ON courses FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete courses
CREATE POLICY "courses: admin write"
  ON courses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- ── lessons ──────────────────────────────────────────────────
-- Authenticated users can read published lessons for courses they are enrolled in
CREATE POLICY "lessons: enrolled students read published"
  ON lessons FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.user_id = auth.uid()
        AND enrollments.course_id = lessons.course_id
    )
  );

-- Admins can read all lessons (including drafts)
CREATE POLICY "lessons: admin read all"
  ON lessons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Only admins can insert/update/delete lessons
CREATE POLICY "lessons: admin write"
  ON lessons FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- ── enrollments ──────────────────────────────────────────────
-- Users can read and create their own enrollments
CREATE POLICY "enrollments: own read"
  ON enrollments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "enrollments: own insert"
  ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can read all enrollments
CREATE POLICY "enrollments: admin read all"
  ON enrollments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- ── progress ─────────────────────────────────────────────────
-- Users can read, insert, and update their own progress
CREATE POLICY "progress: own read"
  ON progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "progress: own insert"
  ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress: own update"
  ON progress FOR UPDATE USING (auth.uid() = user_id);

-- ── certificates ─────────────────────────────────────────────
-- Anyone (even unauthenticated) can read certificates by cert_id
-- This allows the public /certificate/[certId] verification page to work
CREATE POLICY "certificates: public read for verification"
  ON certificates FOR SELECT USING (true);

-- Only authenticated users can insert their own certificates
CREATE POLICY "certificates: own insert"
  ON certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can manage all certificates
CREATE POLICY "certificates: admin all"
  ON certificates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));
