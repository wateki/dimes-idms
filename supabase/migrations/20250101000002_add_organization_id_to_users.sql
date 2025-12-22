-- Migration: Add organizationId to users table
-- Users belong to a single organization
-- Note: Uses text type and camelCase to match existing schema

-- Add organizationId column (nullable initially for migration)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- Create default organization for existing data migration
-- Using text ID format to match schema (all IDs are text, not UUID)
INSERT INTO public.organizations (id, name, slug, "createdAt", "updatedAt")
VALUES (
  'default-org-00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Migrate existing users to default organization
UPDATE public.users 
SET organizationId = 'default-org-00000000-0000-0000-0000-000000000001'
WHERE organizationId IS NULL;

-- Make organizationId required
ALTER TABLE public.users 
ALTER COLUMN organizationId SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_organizationId ON public.users(organizationId);
CREATE INDEX IF NOT EXISTS idx_users_org_active ON public.users(organizationId, "isActive") WHERE "isActive" = true;

-- Add comment
COMMENT ON COLUMN public.users.organizationId IS 'The organization this user belongs to. Users can only belong to one organization.';

