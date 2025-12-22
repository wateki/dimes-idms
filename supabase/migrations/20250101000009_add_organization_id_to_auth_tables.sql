-- Migration: Add organizationId to auth and permission tables
-- Note: Uses text type and camelCase to match existing schema

-- Roles (nullable - can be global templates or org-specific)
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- Existing roles remain global (NULL), new ones will be organization-specific
CREATE INDEX IF NOT EXISTS idx_roles_organizationId ON public.roles(organizationId);

-- Permissions (nullable - can be global templates or org-specific)
ALTER TABLE public.permissions 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- Existing permissions remain global (NULL), new ones can be org-specific
CREATE INDEX IF NOT EXISTS idx_permissions_organizationId ON public.permissions(organizationId);

-- User roles (organization-scoped)
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.user_roles 
SET organizationId = (
  SELECT organizationId FROM public.users WHERE public.users.id = public.user_roles."userId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.user_roles 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_organizationId ON public.user_roles(organizationId);

-- User permissions (organization-scoped)
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.user_permissions 
SET organizationId = (
  SELECT organizationId FROM public.users WHERE public.users.id = public.user_permissions."userId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.user_permissions 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_permissions_organizationId ON public.user_permissions(organizationId);

-- User project access (already project-scoped, add org for consistency)
ALTER TABLE public.user_project_access 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.user_project_access 
SET organizationId = (
  SELECT organizationId FROM public.projects WHERE public.projects.id = public.user_project_access."projectId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.user_project_access 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_project_access_organizationId ON public.user_project_access(organizationId);
