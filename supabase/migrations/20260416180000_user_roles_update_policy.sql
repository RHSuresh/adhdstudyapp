-- The user_roles table has INSERT and SELECT policies but NO UPDATE policy.
-- Supabase upsert uses INSERT ... ON CONFLICT DO UPDATE, which requires an
-- UPDATE policy.  Without it, upserts silently fail when the row already exists.

CREATE POLICY "Users can update own role"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
