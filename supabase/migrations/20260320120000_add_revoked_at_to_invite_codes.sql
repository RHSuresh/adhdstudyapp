ALTER TABLE public.invite_codes
ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
