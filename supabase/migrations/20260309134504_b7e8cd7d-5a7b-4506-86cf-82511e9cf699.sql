CREATE POLICY "Anyone can redeem unused invite codes"
ON public.invite_codes FOR UPDATE
TO authenticated
USING (used_by IS NULL)
WITH CHECK (used_by = auth.uid());