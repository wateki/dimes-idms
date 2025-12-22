-- Migration: Add organizationId to feedback system tables
-- Note: Uses text type and camelCase to match existing schema

-- Feedback forms (belongs to organization, may be project-specific)
ALTER TABLE public.feedback_forms 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.feedback_forms 
SET organizationId = COALESCE(
  (SELECT organizationId FROM public.projects WHERE public.projects.id = public.feedback_forms."projectId"),
  (SELECT organizationId FROM public.users WHERE public.users.id = public.feedback_forms."createdBy" LIMIT 1),
  'default-org-00000000-0000-0000-0000-000000000001'
)
WHERE organizationId IS NULL;

ALTER TABLE public.feedback_forms 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_forms_organizationId ON public.feedback_forms(organizationId);

-- Feedback submissions (inherits from feedback_forms)
ALTER TABLE public.feedback_submissions 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.feedback_submissions 
SET organizationId = (
  SELECT organizationId FROM public.feedback_forms 
  WHERE public.feedback_forms.id = public.feedback_submissions."formId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.feedback_submissions 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_organizationId ON public.feedback_submissions(organizationId);

-- Feedback status history (inherits from feedback_submissions)
ALTER TABLE public.feedback_status_history 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.feedback_status_history 
SET organizationId = (
  SELECT organizationId FROM public.feedback_submissions 
  WHERE public.feedback_submissions.id = public.feedback_status_history."submissionId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.feedback_status_history 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_status_history_organizationId ON public.feedback_status_history(organizationId);

-- Feedback communications (inherits from feedback_submissions)
ALTER TABLE public.feedback_communications 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.feedback_communications 
SET organizationId = (
  SELECT organizationId FROM public.feedback_submissions 
  WHERE public.feedback_submissions.id = public.feedback_communications."submissionId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.feedback_communications 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_communications_organizationId ON public.feedback_communications(organizationId);

-- Feedback notes (inherits from feedback_submissions)
ALTER TABLE public.feedback_notes 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.feedback_notes 
SET organizationId = (
  SELECT organizationId FROM public.feedback_submissions 
  WHERE public.feedback_submissions.id = public.feedback_notes."submissionId"
)
WHERE organizationId IS NULL;

ALTER TABLE public.feedback_notes 
ALTER COLUMN organizationId SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_notes_organizationId ON public.feedback_notes(organizationId);

-- Feedback categories (can be global templates or org-specific, nullable for now)
ALTER TABLE public.feedback_categories 
ADD COLUMN IF NOT EXISTS organizationId TEXT REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- Existing categories remain global (NULL), new ones can be org-specific
CREATE INDEX IF NOT EXISTS idx_feedback_categories_organizationId ON public.feedback_categories(organizationId);
