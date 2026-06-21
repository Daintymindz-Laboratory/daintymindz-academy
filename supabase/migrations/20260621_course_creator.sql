-- Add position/title field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position text;

-- Link courses to their creator admin profile
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
