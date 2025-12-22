-- Migration: Add organizationId to Kobo integration tables
-- Note: Uses text type and camelCase to match existing schema

-- Project Kobo tables (inherits from projects)
ALTER TABLE public.project_kobo_tables 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.project_kobo_tables 
SET organizationId = (
  SELECT organizationId FROM public.projects WHERE public.projects.id = public.project_kobo_tables."projectId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.project_kobo_tables 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_kobo_tables_organizationId ON public.project_kobo_tables(organizationId);

-- Kobo KPI mappings (inherits from project_kobo_tables)
-- Note: Uses projectKoboTableId (camelCase) not table_id
ALTER TABLE public.kobo_kpi_mappings 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.kobo_kpi_mappings 
SET organizationId = (
  SELECT organizationId FROM public.project_kobo_tables 
  WHERE public.project_kobo_tables.id = public.kobo_kpi_mappings."projectKoboTableId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.kobo_kpi_mappings 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kobo_kpi_mappings_organizationId ON public.kobo_kpi_mappings(organizationId);
