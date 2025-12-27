-- Migration: Fix roles table unique constraint to allow same role name per organization
-- Currently, there's a unique constraint on 'name' which prevents organization-specific roles
-- We need to make it unique per (name, organizationid) combination
-- Each organization can have its own roles with the same name (e.g., global-admin per org)

-- Drop the existing unique constraint on name
ALTER TABLE public.roles 
DROP CONSTRAINT IF EXISTS roles_name_key;

-- Create a unique constraint on (name, organizationid)
-- This ensures role names are unique within each organization
-- Different organizations can have roles with the same name
-- Note: organizationid must be NOT NULL for this constraint to work properly
CREATE UNIQUE INDEX IF NOT EXISTS roles_name_organizationid_unique 
ON public.roles (name, organizationid)
WHERE organizationid IS NOT NULL;

-- For roles with NULL organizationid (legacy/global roles), keep them unique by name only
-- This is handled by a separate unique constraint or we can migrate them
CREATE UNIQUE INDEX IF NOT EXISTS roles_name_global_unique 
ON public.roles (name)
WHERE organizationid IS NULL;

-- Add comment
COMMENT ON INDEX public.roles_name_organizationid_unique IS 'Ensures role names are unique within each organization. Each organization can have its own roles.';
COMMENT ON INDEX public.roles_name_global_unique IS 'Ensures global roles (with NULL organizationid) have unique names.';

