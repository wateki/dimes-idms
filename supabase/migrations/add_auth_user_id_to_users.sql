-- Add auth_user_id column to link Supabase Auth users to public.users profile table
-- This allows public.users to act as a profile/extension table for Supabase Auth

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- Add comment to document the relationship
COMMENT ON COLUMN public.users.auth_user_id IS 'Links to Supabase Auth user ID (auth.users.id). This table acts as a profile/extension table for Supabase Auth.';

