-- Migration: Add organizationId to forms and related tables
-- Note: Uses text type and camelCase to match existing schema

-- Forms table (belongs to organization, may be project-specific)
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- If form has a projectId, inherit from project; otherwise from creator
UPDATE public.forms 
SET organizationId = COALESCE(
  (SELECT organizationId FROM public.projects WHERE public.projects.id = public.forms."projectId"),
  (SELECT organizationId FROM public.users WHERE public.users.id = public.forms."createdBy" LIMIT 1),
  'default-org-00000000-0000-0000-0000-000000000001'
)
WHERE organizationId IS NULL;

ALTER TABLE public.forms 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forms_organizationId ON public.forms(organizationId);

-- Form responses (inherits from forms)
ALTER TABLE public.form_responses 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.form_responses 
SET organizationId = (
  SELECT organizationId FROM public.forms WHERE public.forms.id = public.form_responses."formId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.form_responses 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_responses_organizationId ON public.form_responses(organizationId);

-- Form question responses (inherits from form_responses)
ALTER TABLE public.form_question_responses 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.form_question_responses 
SET organizationId = (
  SELECT organizationId FROM public.form_responses 
  WHERE public.form_responses.id = public.form_question_responses."responseId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.form_question_responses 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_question_responses_organizationId ON public.form_question_responses(organizationId);

-- Media attachments (inherits from form_responses or forms)
ALTER TABLE public.media_attachments 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.media_attachments 
SET organizationId = COALESCE(
  (SELECT organizationId FROM public.form_responses 
   WHERE public.form_responses.id = public.media_attachments."responseId"),
  (SELECT organizationId FROM public.forms 
   WHERE public.forms.id = public.media_attachments."formId"),
  'default-org-00000000-0000-0000-0000-000000000001'
)
WHERE organizationId IS NULL;

ALTER TABLE public.media_attachments 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_attachments_organizationId ON public.media_attachments(organizationId);

-- Form templates (can be global or org-specific, nullable for now)
ALTER TABLE public.form_templates 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- Existing templates remain global (NULL), new ones can be org-specific
CREATE INDEX IF NOT EXISTS idx_form_templates_organizationId ON public.form_templates(organizationId);

-- Form workflows (inherits from forms/form_responses)
ALTER TABLE public.form_workflows 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.form_workflows 
SET organizationId = COALESCE(
  (SELECT organizationId FROM public.form_responses 
   WHERE public.form_responses.id = public.form_workflows."responseId"),
  (SELECT organizationId FROM public.forms 
   WHERE public.forms.id = public.form_workflows."formId"),
  'default-org-00000000-0000-0000-0000-000000000001'
)
WHERE organizationId IS NULL;

ALTER TABLE public.form_workflows 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_workflows_organizationId ON public.form_workflows(organizationId);

-- Form analytics (inherits from forms)
ALTER TABLE public.form_analytics 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.form_analytics 
SET organizationId = (
  SELECT organizationId FROM public.forms WHERE public.forms.id = public.form_analytics."formId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.form_analytics 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_analytics_organizationId ON public.form_analytics(organizationId);

-- Form permissions (inherits from forms)
ALTER TABLE public.form_permissions 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.form_permissions 
SET organizationId = (
  SELECT organizationId FROM public.forms WHERE public.forms.id = public.form_permissions."formId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.form_permissions 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_permissions_organizationId ON public.form_permissions(organizationId);
