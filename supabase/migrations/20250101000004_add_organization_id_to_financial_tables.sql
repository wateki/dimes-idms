-- Migration: Add organizationId to financial data tables
-- Note: Uses text type and camelCase to match existing schema

-- Project financial data (inherits from projects)
ALTER TABLE public.project_financial_data 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.project_financial_data 
SET organizationId = (
  SELECT organizationId FROM public.projects WHERE public.projects.id = public.project_financial_data."projectId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.project_financial_data 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_financial_data_organizationId ON public.project_financial_data(organizationId);

-- Activity financial data (inherits from project_financial_data)
ALTER TABLE public.activity_financial_data 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.activity_financial_data 
SET organizationId = (
  SELECT organizationId FROM public.project_financial_data 
  WHERE public.project_financial_data.id = public.activity_financial_data."projectFinancialId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.activity_financial_data 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_financial_data_organizationId ON public.activity_financial_data(organizationId);
