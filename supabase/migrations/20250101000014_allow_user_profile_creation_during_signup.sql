-- Migration: Allow users to create their own profile during signup
-- This policy allows a user to insert their own profile in the users table
-- when the auth_user_id matches their authenticated auth user ID
-- This is needed for the signup flow where users create their profile

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can create their own profile during signup" ON public.users;

-- Create policy that allows users to insert their own profile
-- This checks that auth_user_id matches the authenticated user's ID
-- Both are UUID type, so direct comparison works
-- Note: Column name is lowercase 'organizationid' (not camelCase)
CREATE POLICY "Users can create their own profile during signup"
ON public.users FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
  AND organizationid IS NOT NULL
);

