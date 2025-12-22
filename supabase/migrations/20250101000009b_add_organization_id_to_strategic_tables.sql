-- Migration: Add organizationId to strategic planning tables
-- Note: Uses text type and camelCase to match existing schema

-- Strategic plans (belongs to organization)
ALTER TABLE public.strategic_plans 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.strategic_plans 
SET organizationId = COALESCE(
  (SELECT organizationId FROM public.users WHERE public.users.id = public.strategic_plans."createdBy" LIMIT 1),
  'default-org-00000000-0000-0000-0000-000000000001'
)
WHERE organizationId IS NULL;

ALTER TABLE public.strategic_plans 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_strategic_plans_organizationId ON public.strategic_plans(organizationId);

-- Strategic goals (inherits from strategic_plans)
ALTER TABLE public.strategic_goals 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.strategic_goals 
SET organizationId = (
  SELECT organizationId FROM public.strategic_plans 
  WHERE public.strategic_plans.id = public.strategic_goals."strategicPlanId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.strategic_goals 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_strategic_goals_organizationId ON public.strategic_goals(organizationId);

-- Strategic subgoals (inherits from strategic_goals)
ALTER TABLE public.strategic_subgoals 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.strategic_subgoals 
SET organizationId = (
  SELECT organizationId FROM public.strategic_goals 
  WHERE public.strategic_goals.id = public.strategic_subgoals."strategicGoalId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.strategic_subgoals 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_strategic_subgoals_organizationId ON public.strategic_subgoals(organizationId);

-- Strategic KPIs (inherits from strategic_subgoals)
ALTER TABLE public.strategic_kpis 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.strategic_kpis 
SET organizationId = (
  SELECT organizationId FROM public.strategic_subgoals 
  WHERE public.strategic_subgoals.id = public.strategic_kpis."strategicSubGoalId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.strategic_kpis 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_strategic_kpis_organizationId ON public.strategic_kpis(organizationId);

