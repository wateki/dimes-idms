-- Migration: Add organizationId to reports and report workflows
-- Note: Uses text type and camelCase to match existing schema

-- Reports table (belongs to organization, linked to projects)
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.reports 
SET organizationId = COALESCE(
  (SELECT organizationId FROM public.projects WHERE public.projects.id = public.reports."projectId"),
  (SELECT organizationId FROM public.users WHERE public.users.id = public.reports."createdBy" LIMIT 1),
  'default-org-00000000-0000-0000-0000-000000000001'
)
WHERE organizationId IS NULL;

ALTER TABLE public.reports 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_organizationId ON public.reports(organizationId);

-- Report workflows (belongs to organization, linked to projects)
ALTER TABLE public.report_workflows 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.report_workflows 
SET organizationId = COALESCE(
  (SELECT organizationId FROM public.projects WHERE public.projects.id = public.report_workflows."projectId"),
  (SELECT organizationId FROM public.users WHERE public.users.id = public.report_workflows."submittedBy" LIMIT 1),
  'default-org-00000000-0000-0000-0000-000000000001'
)
WHERE organizationId IS NULL;

ALTER TABLE public.report_workflows 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_workflows_organizationId ON public.report_workflows(organizationId);

-- Report approval steps (inherits from report_workflows)
ALTER TABLE public.report_approval_steps 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.report_approval_steps 
SET organizationId = (
  SELECT organizationId FROM public.report_workflows 
  WHERE public.report_workflows.id = public.report_approval_steps."reportWorkflowId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.report_approval_steps 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_approval_steps_organizationId ON public.report_approval_steps(organizationId);

-- Report comments (inherits from report_workflows)
ALTER TABLE public.report_comments 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.report_comments 
SET organizationId = (
  SELECT organizationId FROM public.report_workflows 
  WHERE public.report_workflows.id = public.report_comments."reportWorkflowId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.report_comments 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_comments_organizationId ON public.report_comments(organizationId);

-- Report workflow status history (inherits from report_workflows)
ALTER TABLE public.report_workflow_status_history 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.report_workflow_status_history 
SET organizationId = (
  SELECT organizationId FROM public.report_workflows 
  WHERE public.report_workflows.id = public.report_workflow_status_history."reportWorkflowId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.report_workflow_status_history 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_workflow_status_history_organizationId ON public.report_workflow_status_history(organizationId);

-- Report workflow versions (inherits from report_workflows)
ALTER TABLE public.report_workflow_versions 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.report_workflow_versions 
SET organizationId = (
  SELECT organizationId FROM public.report_workflows 
  WHERE public.report_workflows.id = public.report_workflow_versions."reportWorkflowId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.report_workflow_versions 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_workflow_versions_organizationId ON public.report_workflow_versions(organizationId);
