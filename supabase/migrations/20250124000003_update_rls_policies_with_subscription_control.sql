-- Migration: Update RLS policies to include subscription-based access control
-- This adds subscription and usage limit checks to all INSERT and UPDATE operations

-- Helper function to map table names to metrics
CREATE OR REPLACE FUNCTION public.get_metric_for_table(p_table_name TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE p_table_name
    WHEN 'users' THEN RETURN 'users';
    WHEN 'projects' THEN RETURN 'projects';
    WHEN 'forms' THEN RETURN 'forms';
    WHEN 'form_responses' THEN RETURN 'form_responses';
    WHEN 'reports' THEN RETURN 'reports';
    WHEN 'feedback_forms' THEN RETURN 'feedback_forms';
    WHEN 'feedback_submissions' THEN RETURN 'form_responses'; -- Feedback submissions count as form responses
    WHEN 'project_kobo_tables' THEN RETURN 'kobo_tables';
    WHEN 'strategic_plans' THEN RETURN 'strategic_plans';
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Drop existing INSERT and UPDATE policies (we'll recreate them with subscription checks)
-- Projects
DROP POLICY IF EXISTS "Users can insert projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects in their organization" ON public.projects;

-- Activities
DROP POLICY IF EXISTS "Users can insert activities in their organization" ON public.activities;
DROP POLICY IF EXISTS "Users can update activities in their organization" ON public.activities;

-- Outcomes
DROP POLICY IF EXISTS "Users can insert outcomes in their organization" ON public.outcomes;
DROP POLICY IF EXISTS "Users can update outcomes in their organization" ON public.outcomes;

-- KPIs
DROP POLICY IF EXISTS "Users can insert kpis in their organization" ON public.kpis;
DROP POLICY IF EXISTS "Users can update kpis in their organization" ON public.kpis;

-- Sub-activities
DROP POLICY IF EXISTS "Users can insert sub activities in their organization" ON public.sub_activities;
DROP POLICY IF EXISTS "Users can update sub activities in their organization" ON public.sub_activities;

-- Outputs
DROP POLICY IF EXISTS "Users can insert outputs in their organization" ON public.outputs;
DROP POLICY IF EXISTS "Users can update outputs in their organization" ON public.outputs;

-- Activity progress
DROP POLICY IF EXISTS "Users can insert activity progress in their organization" ON public.activity_progress_entries;
DROP POLICY IF EXISTS "Users can update activity progress in their organization" ON public.activity_progress_entries;

-- Strategic activity links
DROP POLICY IF EXISTS "Users can insert strategic activity links in their organization" ON public.strategic_activity_links;
DROP POLICY IF EXISTS "Users can update strategic activity links in their organization" ON public.strategic_activity_links;

-- Project financial data
DROP POLICY IF EXISTS "Users can insert project financial data in their organization" ON public.project_financial_data;
DROP POLICY IF EXISTS "Users can update project financial data in their organization" ON public.project_financial_data;

-- Activity financial data
DROP POLICY IF EXISTS "Users can insert activity financial data in their organization" ON public.activity_financial_data;
DROP POLICY IF EXISTS "Users can update activity financial data in their organization" ON public.activity_financial_data;

-- Forms
DROP POLICY IF EXISTS "Users can insert forms in their organization" ON public.forms;
DROP POLICY IF EXISTS "Users can update forms in their organization" ON public.forms;

-- Form responses
DROP POLICY IF EXISTS "Users can insert form responses in their organization" ON public.form_responses;
DROP POLICY IF EXISTS "Users can update form responses in their organization" ON public.form_responses;

-- Form question responses
DROP POLICY IF EXISTS "Users can insert form question responses in their organization" ON public.form_question_responses;
DROP POLICY IF EXISTS "Users can update form question responses in their organization" ON public.form_question_responses;

-- Media attachments
DROP POLICY IF EXISTS "Users can insert media attachments in their organization" ON public.media_attachments;
DROP POLICY IF EXISTS "Users can update media attachments in their organization" ON public.media_attachments;

-- Reports
DROP POLICY IF EXISTS "Users can insert reports in their organization" ON public.reports;
DROP POLICY IF EXISTS "Users can update reports in their organization" ON public.reports;

-- Report workflows
DROP POLICY IF EXISTS "Users can insert report workflows in their organization" ON public.report_workflows;
DROP POLICY IF EXISTS "Users can update report workflows in their organization" ON public.report_workflows;

-- Feedback forms
DROP POLICY IF EXISTS "Users can insert feedback forms in their organization" ON public.feedback_forms;
DROP POLICY IF EXISTS "Users can update feedback forms in their organization" ON public.feedback_forms;

-- Feedback submissions
DROP POLICY IF EXISTS "Users can insert feedback submissions in their organization" ON public.feedback_submissions;
DROP POLICY IF EXISTS "Users can update feedback submissions in their organization" ON public.feedback_submissions;

-- Feedback status history
DROP POLICY IF EXISTS "Users can insert feedback status history in their organization" ON public.feedback_status_history;
DROP POLICY IF EXISTS "Users can update feedback status history in their organization" ON public.feedback_status_history;

-- Feedback communications
DROP POLICY IF EXISTS "Users can insert feedback communications in their organization" ON public.feedback_communications;
DROP POLICY IF EXISTS "Users can update feedback communications in their organization" ON public.feedback_communications;

-- Feedback notes
DROP POLICY IF EXISTS "Users can insert feedback notes in their organization" ON public.feedback_notes;
DROP POLICY IF EXISTS "Users can update feedback notes in their organization" ON public.feedback_notes;

-- Project Kobo tables
DROP POLICY IF EXISTS "Users can insert project kobo tables in their organization" ON public.project_kobo_tables;
DROP POLICY IF EXISTS "Users can update project kobo tables in their organization" ON public.project_kobo_tables;

-- Kobo KPI mappings
DROP POLICY IF EXISTS "Users can insert kobo kpi mappings in their organization" ON public.kobo_kpi_mappings;
DROP POLICY IF EXISTS "Users can update kobo kpi mappings in their organization" ON public.kobo_kpi_mappings;

-- User roles
DROP POLICY IF EXISTS "Users can insert user roles in their organization" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update user roles in their organization" ON public.user_roles;

-- User permissions
DROP POLICY IF EXISTS "Users can insert user permissions in their organization" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can update user permissions in their organization" ON public.user_permissions;

-- User project access
DROP POLICY IF EXISTS "Users can insert user project access in their organization" ON public.user_project_access;
DROP POLICY IF EXISTS "Users can update user project access in their organization" ON public.user_project_access;

-- Milestones
DROP POLICY IF EXISTS "Users can insert milestones in their organization" ON public.milestones;
DROP POLICY IF EXISTS "Users can update milestones in their organization" ON public.milestones;

-- Form workflows
DROP POLICY IF EXISTS "Users can insert form workflows in their organization" ON public.form_workflows;
DROP POLICY IF EXISTS "Users can update form workflows in their organization" ON public.form_workflows;

-- Form analytics
DROP POLICY IF EXISTS "Users can insert form analytics in their organization" ON public.form_analytics;
DROP POLICY IF EXISTS "Users can update form analytics in their organization" ON public.form_analytics;

-- Form permissions
DROP POLICY IF EXISTS "Users can insert form permissions in their organization" ON public.form_permissions;
DROP POLICY IF EXISTS "Users can update form permissions in their organization" ON public.form_permissions;

-- Report approval steps
DROP POLICY IF EXISTS "Users can insert report approval steps in their organization" ON public.report_approval_steps;
DROP POLICY IF EXISTS "Users can update report approval steps in their organization" ON public.report_approval_steps;

-- Report comments
DROP POLICY IF EXISTS "Users can insert report comments in their organization" ON public.report_comments;
DROP POLICY IF EXISTS "Users can update report comments in their organization" ON public.report_comments;

-- Report workflow status history
DROP POLICY IF EXISTS "Users can insert report workflow status history in their organization" ON public.report_workflow_status_history;
DROP POLICY IF EXISTS "Users can update report workflow status history in their organization" ON public.report_workflow_status_history;

-- Report workflow versions
DROP POLICY IF EXISTS "Users can insert report workflow versions in their organization" ON public.report_workflow_versions;
DROP POLICY IF EXISTS "Users can update report workflow versions in their organization" ON public.report_workflow_versions;

-- Strategic plans
DROP POLICY IF EXISTS "Users can insert strategic plans in their organization" ON public.strategic_plans;
DROP POLICY IF EXISTS "Users can update strategic plans in their organization" ON public.strategic_plans;

-- Strategic goals
DROP POLICY IF EXISTS "Users can insert strategic goals in their organization" ON public.strategic_goals;
DROP POLICY IF EXISTS "Users can update strategic goals in their organization" ON public.strategic_goals;

-- Strategic subgoals
DROP POLICY IF EXISTS "Users can insert strategic subgoals in their organization" ON public.strategic_subgoals;
DROP POLICY IF EXISTS "Users can update strategic subgoals in their organization" ON public.strategic_subgoals;

-- Strategic KPIs
DROP POLICY IF EXISTS "Users can insert strategic kpis in their organization" ON public.strategic_kpis;
DROP POLICY IF EXISTS "Users can update strategic kpis in their organization" ON public.strategic_kpis;

-- Users (update only - creation might be handled differently)
DROP POLICY IF EXISTS "Users can update users in their organization" ON public.users;

-- ============================================
-- RECREATE POLICIES WITH SUBSCRIPTION CHECKS
-- ============================================

-- Projects: INSERT with subscription check
CREATE POLICY "Users can insert projects in their organization"
ON public.projects FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'projects',
    'create'
  )
);

-- Projects: UPDATE with subscription check
CREATE POLICY "Users can update projects in their organization"
ON public.projects FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'projects',
    'update'
  )
);

-- Activities: INSERT with subscription check
CREATE POLICY "Users can insert activities in their organization"
ON public.activities FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Activities: UPDATE with subscription check
CREATE POLICY "Users can update activities in their organization"
ON public.activities FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Outcomes: INSERT with subscription check
CREATE POLICY "Users can insert outcomes in their organization"
ON public.outcomes FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Outcomes: UPDATE with subscription check
CREATE POLICY "Users can update outcomes in their organization"
ON public.outcomes FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- KPIs: INSERT with subscription check
CREATE POLICY "Users can insert kpis in their organization"
ON public.kpis FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- KPIs: UPDATE with subscription check
CREATE POLICY "Users can update kpis in their organization"
ON public.kpis FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Sub-activities: INSERT with subscription check
CREATE POLICY "Users can insert sub activities in their organization"
ON public.sub_activities FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Sub-activities: UPDATE with subscription check
CREATE POLICY "Users can update sub activities in their organization"
ON public.sub_activities FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Outputs: INSERT with subscription check
CREATE POLICY "Users can insert outputs in their organization"
ON public.outputs FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Outputs: UPDATE with subscription check
CREATE POLICY "Users can update outputs in their organization"
ON public.outputs FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Activity progress: INSERT with subscription check
CREATE POLICY "Users can insert activity progress in their organization"
ON public.activity_progress_entries FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Activity progress: UPDATE with subscription check
CREATE POLICY "Users can update activity progress in their organization"
ON public.activity_progress_entries FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Strategic activity links: INSERT with subscription check
CREATE POLICY "Users can insert strategic activity links in their organization"
ON public.strategic_activity_links FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Strategic activity links: UPDATE with subscription check
CREATE POLICY "Users can update strategic activity links in their organization"
ON public.strategic_activity_links FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Project financial data: INSERT with subscription check
CREATE POLICY "Users can insert project financial data in their organization"
ON public.project_financial_data FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Project financial data: UPDATE with subscription check
CREATE POLICY "Users can update project financial data in their organization"
ON public.project_financial_data FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Activity financial data: INSERT with subscription check
CREATE POLICY "Users can insert activity financial data in their organization"
ON public.activity_financial_data FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Activity financial data: UPDATE with subscription check
CREATE POLICY "Users can update activity financial data in their organization"
ON public.activity_financial_data FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Forms: INSERT with subscription check
CREATE POLICY "Users can insert forms in their organization"
ON public.forms FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'forms',
    'create'
  )
);

-- Forms: UPDATE with subscription check
CREATE POLICY "Users can update forms in their organization"
ON public.forms FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'forms',
    'update'
  )
);

-- Form responses: INSERT with subscription check
CREATE POLICY "Users can insert form responses in their organization"
ON public.form_responses FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'form_responses',
    'create'
  )
);

-- Form responses: UPDATE with subscription check
CREATE POLICY "Users can update form responses in their organization"
ON public.form_responses FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'form_responses',
    'update'
  )
);

-- Form question responses: INSERT with subscription check
CREATE POLICY "Users can insert form question responses in their organization"
ON public.form_question_responses FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Form question responses: UPDATE with subscription check
CREATE POLICY "Users can update form question responses in their organization"
ON public.form_question_responses FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Media attachments: INSERT with subscription check
CREATE POLICY "Users can insert media attachments in their organization"
ON public.media_attachments FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Media attachments: UPDATE with subscription check
CREATE POLICY "Users can update media attachments in their organization"
ON public.media_attachments FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Reports: INSERT with subscription check
CREATE POLICY "Users can insert reports in their organization"
ON public.reports FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'reports',
    'create'
  )
);

-- Reports: UPDATE with subscription check
CREATE POLICY "Users can update reports in their organization"
ON public.reports FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'reports',
    'update'
  )
);

-- Report workflows: INSERT with subscription check
CREATE POLICY "Users can insert report workflows in their organization"
ON public.report_workflows FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Report workflows: UPDATE with subscription check
CREATE POLICY "Users can update report workflows in their organization"
ON public.report_workflows FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Feedback forms: INSERT with subscription check
CREATE POLICY "Users can insert feedback forms in their organization"
ON public.feedback_forms FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'feedback_forms',
    'create'
  )
);

-- Feedback forms: UPDATE with subscription check
CREATE POLICY "Users can update feedback forms in their organization"
ON public.feedback_forms FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'feedback_forms',
    'update'
  )
);

-- Feedback submissions: INSERT with subscription check (counts as form_responses)
CREATE POLICY "Users can insert feedback submissions in their organization"
ON public.feedback_submissions FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'form_responses',
    'create'
  )
);

-- Feedback submissions: UPDATE with subscription check
CREATE POLICY "Users can update feedback submissions in their organization"
ON public.feedback_submissions FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'form_responses',
    'update'
  )
);

-- Feedback status history: INSERT with subscription check
CREATE POLICY "Users can insert feedback status history in their organization"
ON public.feedback_status_history FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Feedback status history: UPDATE with subscription check
CREATE POLICY "Users can update feedback status history in their organization"
ON public.feedback_status_history FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Feedback communications: INSERT with subscription check
CREATE POLICY "Users can insert feedback communications in their organization"
ON public.feedback_communications FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Feedback communications: UPDATE with subscription check
CREATE POLICY "Users can update feedback communications in their organization"
ON public.feedback_communications FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Feedback notes: INSERT with subscription check
CREATE POLICY "Users can insert feedback notes in their organization"
ON public.feedback_notes FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Feedback notes: UPDATE with subscription check
CREATE POLICY "Users can update feedback notes in their organization"
ON public.feedback_notes FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Project Kobo tables: INSERT with subscription check
CREATE POLICY "Users can insert project kobo tables in their organization"
ON public.project_kobo_tables FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'kobo_tables',
    'create'
  )
);

-- Project Kobo tables: UPDATE with subscription check
CREATE POLICY "Users can update project kobo tables in their organization"
ON public.project_kobo_tables FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'kobo_tables',
    'update'
  )
);

-- Kobo KPI mappings: INSERT with subscription check
CREATE POLICY "Users can insert kobo kpi mappings in their organization"
ON public.kobo_kpi_mappings FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Kobo KPI mappings: UPDATE with subscription check
CREATE POLICY "Users can update kobo kpi mappings in their organization"
ON public.kobo_kpi_mappings FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- User roles: INSERT with subscription check
CREATE POLICY "Users can insert user roles in their organization"
ON public.user_roles FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- User roles: UPDATE with subscription check
CREATE POLICY "Users can update user roles in their organization"
ON public.user_roles FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- User permissions: INSERT with subscription check
CREATE POLICY "Users can insert user permissions in their organization"
ON public.user_permissions FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- User permissions: UPDATE with subscription check
CREATE POLICY "Users can update user permissions in their organization"
ON public.user_permissions FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- User project access: INSERT with subscription check
CREATE POLICY "Users can insert user project access in their organization"
ON public.user_project_access FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- User project access: UPDATE with subscription check
CREATE POLICY "Users can update user project access in their organization"
ON public.user_project_access FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Milestones: INSERT with subscription check
CREATE POLICY "Users can insert milestones in their organization"
ON public.milestones FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Milestones: UPDATE with subscription check
CREATE POLICY "Users can update milestones in their organization"
ON public.milestones FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Form workflows: INSERT with subscription check
CREATE POLICY "Users can insert form workflows in their organization"
ON public.form_workflows FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Form workflows: UPDATE with subscription check
CREATE POLICY "Users can update form workflows in their organization"
ON public.form_workflows FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Form analytics: INSERT with subscription check
CREATE POLICY "Users can insert form analytics in their organization"
ON public.form_analytics FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Form analytics: UPDATE with subscription check
CREATE POLICY "Users can update form analytics in their organization"
ON public.form_analytics FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Form permissions: INSERT with subscription check
CREATE POLICY "Users can insert form permissions in their organization"
ON public.form_permissions FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Form permissions: UPDATE with subscription check
CREATE POLICY "Users can update form permissions in their organization"
ON public.form_permissions FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Report approval steps: INSERT with subscription check
CREATE POLICY "Users can insert report approval steps in their organization"
ON public.report_approval_steps FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Report approval steps: UPDATE with subscription check
CREATE POLICY "Users can update report approval steps in their organization"
ON public.report_approval_steps FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Report comments: INSERT with subscription check
CREATE POLICY "Users can insert report comments in their organization"
ON public.report_comments FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Report comments: UPDATE with subscription check
CREATE POLICY "Users can update report comments in their organization"
ON public.report_comments FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Report workflow status history: INSERT with subscription check
CREATE POLICY "Users can insert report workflow status history in their organization"
ON public.report_workflow_status_history FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Report workflow status history: UPDATE with subscription check
CREATE POLICY "Users can update report workflow status history in their organization"
ON public.report_workflow_status_history FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Report workflow versions: INSERT with subscription check
CREATE POLICY "Users can insert report workflow versions in their organization"
ON public.report_workflow_versions FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Report workflow versions: UPDATE with subscription check
CREATE POLICY "Users can update report workflow versions in their organization"
ON public.report_workflow_versions FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Strategic plans: INSERT with subscription check
CREATE POLICY "Users can insert strategic plans in their organization"
ON public.strategic_plans FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'strategic_plans',
    'create'
  )
);

-- Strategic plans: UPDATE with subscription check
CREATE POLICY "Users can update strategic plans in their organization"
ON public.strategic_plans FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'strategic_plans',
    'update'
  )
);

-- Strategic goals: INSERT with subscription check
CREATE POLICY "Users can insert strategic goals in their organization"
ON public.strategic_goals FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Strategic goals: UPDATE with subscription check
CREATE POLICY "Users can update strategic goals in their organization"
ON public.strategic_goals FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Strategic subgoals: INSERT with subscription check
CREATE POLICY "Users can insert strategic subgoals in their organization"
ON public.strategic_subgoals FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Strategic subgoals: UPDATE with subscription check
CREATE POLICY "Users can update strategic subgoals in their organization"
ON public.strategic_subgoals FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Strategic KPIs: INSERT with subscription check
CREATE POLICY "Users can insert strategic kpis in their organization"
ON public.strategic_kpis FOR INSERT
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Strategic KPIs: UPDATE with subscription check
CREATE POLICY "Users can update strategic kpis in their organization"
ON public.strategic_kpis FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.has_active_subscription(public.get_user_organization_id())
);

-- Users: UPDATE with subscription check (INSERT might be handled differently)
CREATE POLICY "Users can update users in their organization"
ON public.users FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (
  organizationId = public.get_user_organization_id()
  AND public.can_perform_operation(
    public.get_user_organization_id(),
    'users',
    'update'
  )
);

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION public.get_metric_for_table(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_metric_for_table IS 'Maps table names to usage tracking metrics. Used in RLS policies for subscription access control.';
