ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Preserve access for everyone who already had an Academy account.
UPDATE profiles
SET approval_status = 'approved', approved_at = COALESCE(approved_at, now())
WHERE approval_status = 'pending';

CREATE OR REPLACE FUNCTION public.set_profile_approval(p_user_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only administrators can approve accounts';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval status';
  END IF;

  UPDATE profiles
  SET approval_status = p_status,
      approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE NULL END,
      approved_by = auth.uid()
  WHERE id = p_user_id;

  INSERT INTO notifications(user_id, type, title, message, link)
  VALUES (
    p_user_id,
    CASE WHEN p_status = 'approved' THEN 'account_approved' ELSE 'account_rejected' END,
    CASE WHEN p_status = 'approved' THEN 'Academy access approved' ELSE 'Academy access request declined' END,
    CASE WHEN p_status = 'approved'
      THEN 'Your Daintymindz Academy account has been approved. You can now access the Academy.'
      ELSE 'Your request for access to Daintymindz Academy was not approved. Contact an administrator if you believe this is an error.' END,
    CASE WHEN p_status = 'approved' THEN '/dashboard' ELSE '/pending-approval' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_approval(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_profile_approval(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_admins_of_pending_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications(user_id, type, title, message, link)
  SELECT id, 'account_pending', 'New account awaiting approval',
         COALESCE(NEW.full_name, 'A new user') || ' requested access to Daintymindz Academy.',
         '/admin'
  FROM profiles
  WHERE is_admin = true AND id <> NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_notify_pending_account ON profiles;
CREATE TRIGGER profiles_notify_pending_account
AFTER INSERT ON profiles
FOR EACH ROW
WHEN (NEW.approval_status = 'pending')
EXECUTE FUNCTION public.notify_admins_of_pending_account();

NOTIFY pgrst, 'reload schema';
