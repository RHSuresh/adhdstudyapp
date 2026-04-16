-- The user_roles table has UNIQUE(user_id, role) but no standalone UNIQUE on
-- user_id.  The frontend uses upsert(..., { onConflict: 'user_id' }) which
-- requires a unique index on just user_id.  Each user only ever has one role,
-- so this is semantically correct.

-- First drop the old composite unique constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Add a unique constraint on user_id alone
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
