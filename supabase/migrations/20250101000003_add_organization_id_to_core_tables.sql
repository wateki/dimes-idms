-- Migration: Add organizationId to core project-related tables
-- Projects, activities, outcomes, KPIs, outputs, strategic_activity_links
-- Note: Uses text type and camelCase to match existing schema

-- Projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- Migrate existing projects based on creator's organization
UPDATE public.projects 
SET organizationId = (
  SELECT organizationId FROM public.users WHERE public.users.id = public.projects."createdBy" LIMIT 1
)
WHERE organizationId IS NULL;

-- Set to default org if no creator found
UPDATE public.projects 
SET organizationId = 'default-org-00000000-0000-0000-0000-000000000001'
WHERE organizationId IS NULL;

ALTER TABLE public.projects 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_organizationId ON public.projects(organizationId);
CREATE INDEX IF NOT EXISTS idx_projects_org_status ON public.projects(organizationId, status);

-- Activities table (inherits from projects)
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.activities 
SET organizationId = (
  SELECT organizationId FROM public.projects WHERE public.projects.id = public.activities."projectId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.activities 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_organizationId ON public.activities(organizationId);

-- Outcomes table (inherits from projects)
ALTER TABLE public.outcomes 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.outcomes 
SET organizationId = (
  SELECT organizationId FROM public.projects WHERE public.projects.id = public.outcomes."projectId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.outcomes 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outcomes_organizationId ON public.outcomes(organizationId);

-- KPIs table (inherits from projects)
ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.kpis 
SET organizationId = (
  SELECT organizationId FROM public.projects WHERE public.projects.id = public.kpis."projectId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.kpis 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kpis_organizationId ON public.kpis(organizationId);

-- Outputs table (inherits from projects)
ALTER TABLE public.outputs 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.outputs 
SET organizationId = (
  SELECT organizationId FROM public.projects WHERE public.projects.id = public.outputs."projectId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.outputs 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outputs_organizationId ON public.outputs(organizationId);

-- Activity progress entries (inherits from activities)
ALTER TABLE public.activity_progress_entries 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.activity_progress_entries 
SET organizationId = (
  SELECT organizationId FROM public.activities WHERE public.activities.id = public.activity_progress_entries."activityId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.activity_progress_entries 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_progress_entries_organizationId ON public.activity_progress_entries(organizationId);

-- Strategic activity links (inherits from projects)
ALTER TABLE public.strategic_activity_links 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.strategic_activity_links 
SET organizationId = (
  SELECT organizationId FROM public.projects WHERE public.projects.id = public.strategic_activity_links."projectId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.strategic_activity_links 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_strategic_activity_links_organizationId ON public.strategic_activity_links(organizationId);

-- Sub activities (inherits from activities)
ALTER TABLE public.sub_activities 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.sub_activities 
SET organizationId = (
  SELECT organizationId FROM public.activities WHERE public.activities.id = public.sub_activities."activityId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.sub_activities 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sub_activities_organizationId ON public.sub_activities(organizationId);

-- Milestones (inherits from activities)
ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.milestones 
SET organizationId = (
  SELECT organizationId FROM public.activities WHERE public.activities.id = public.milestones."activityId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.milestones 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_milestones_organizationId ON public.milestones(organizationId);
