-- Migration: Create helper function for RLS policies
-- This function gets the organizationId of the current authenticated user
-- Note: Returns text type to match schema convention

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS TEXT AS $$
  SELECT organizationId 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_organization_id() IS 'Returns the organizationId of the currently authenticated user. Used in RLS policies for multi-tenant data isolation.';

