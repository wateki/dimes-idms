-- Migration: Enable Row Level Security and create policies for all tenant tables
-- This ensures complete data isolation between organizations

-- Enable RLS on all tenant tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_activity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_kobo_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kobo_kpi_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_workflow_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_subgoals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_kpis ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;
DROP POLICY IF EXISTS "Users can view projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can insert projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects in their organization" ON public.projects;

-- Users table policies
CREATE POLICY "Users can view users in their organization"
ON public.users FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update users in their organization"
ON public.users FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

-- Projects table policies
CREATE POLICY "Users can view projects in their organization"
ON public.projects FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert projects in their organization"
ON public.projects FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update projects in their organization"
ON public.projects FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete projects in their organization"
ON public.projects FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Activities table policies
CREATE POLICY "Users can view activities in their organization"
ON public.activities FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert activities in their organization"
ON public.activities FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update activities in their organization"
ON public.activities FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete activities in their organization"
ON public.activities FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Outcomes table policies
CREATE POLICY "Users can view outcomes in their organization"
ON public.outcomes FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert outcomes in their organization"
ON public.outcomes FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update outcomes in their organization"
ON public.outcomes FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete outcomes in their organization"
ON public.outcomes FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- KPIs table policies
CREATE POLICY "Users can view kpis in their organization"
ON public.kpis FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert kpis in their organization"
ON public.kpis FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update kpis in their organization"
ON public.kpis FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete kpis in their organization"
ON public.kpis FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Activity progress entries policies
CREATE POLICY "Users can view activity progress in their organization"
ON public.activity_progress_entries FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert activity progress in their organization"
ON public.activity_progress_entries FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update activity progress in their organization"
ON public.activity_progress_entries FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete activity progress in their organization"
ON public.activity_progress_entries FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Outputs policies
CREATE POLICY "Users can view outputs in their organization"
ON public.outputs FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert outputs in their organization"
ON public.outputs FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update outputs in their organization"
ON public.outputs FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete outputs in their organization"
ON public.outputs FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Strategic activity links policies
CREATE POLICY "Users can view strategic activity links in their organization"
ON public.strategic_activity_links FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert strategic activity links in their organization"
ON public.strategic_activity_links FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update strategic activity links in their organization"
ON public.strategic_activity_links FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete strategic activity links in their organization"
ON public.strategic_activity_links FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Project financial data policies
CREATE POLICY "Users can view project financial data in their organization"
ON public.project_financial_data FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert project financial data in their organization"
ON public.project_financial_data FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update project financial data in their organization"
ON public.project_financial_data FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete project financial data in their organization"
ON public.project_financial_data FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Activity financial data policies
CREATE POLICY "Users can view activity financial data in their organization"
ON public.activity_financial_data FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert activity financial data in their organization"
ON public.activity_financial_data FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update activity financial data in their organization"
ON public.activity_financial_data FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete activity financial data in their organization"
ON public.activity_financial_data FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Forms policies
CREATE POLICY "Users can view forms in their organization"
ON public.forms FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert forms in their organization"
ON public.forms FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update forms in their organization"
ON public.forms FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete forms in their organization"
ON public.forms FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Form responses policies
CREATE POLICY "Users can view form responses in their organization"
ON public.form_responses FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert form responses in their organization"
ON public.form_responses FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update form responses in their organization"
ON public.form_responses FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete form responses in their organization"
ON public.form_responses FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Form question responses policies
CREATE POLICY "Users can view form question responses in their organization"
ON public.form_question_responses FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert form question responses in their organization"
ON public.form_question_responses FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update form question responses in their organization"
ON public.form_question_responses FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete form question responses in their organization"
ON public.form_question_responses FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Media attachments policies
CREATE POLICY "Users can view media attachments in their organization"
ON public.media_attachments FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert media attachments in their organization"
ON public.media_attachments FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update media attachments in their organization"
ON public.media_attachments FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete media attachments in their organization"
ON public.media_attachments FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Reports policies
CREATE POLICY "Users can view reports in their organization"
ON public.reports FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert reports in their organization"
ON public.reports FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update reports in their organization"
ON public.reports FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete reports in their organization"
ON public.reports FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Report workflows policies
CREATE POLICY "Users can view report workflows in their organization"
ON public.report_workflows FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert report workflows in their organization"
ON public.report_workflows FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update report workflows in their organization"
ON public.report_workflows FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete report workflows in their organization"
ON public.report_workflows FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Feedback forms policies
CREATE POLICY "Users can view feedback forms in their organization"
ON public.feedback_forms FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert feedback forms in their organization"
ON public.feedback_forms FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update feedback forms in their organization"
ON public.feedback_forms FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete feedback forms in their organization"
ON public.feedback_forms FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Feedback submissions policies
CREATE POLICY "Users can view feedback submissions in their organization"
ON public.feedback_submissions FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert feedback submissions in their organization"
ON public.feedback_submissions FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update feedback submissions in their organization"
ON public.feedback_submissions FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete feedback submissions in their organization"
ON public.feedback_submissions FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Feedback status history policies
CREATE POLICY "Users can view feedback status history in their organization"
ON public.feedback_status_history FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert feedback status history in their organization"
ON public.feedback_status_history FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update feedback status history in their organization"
ON public.feedback_status_history FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete feedback status history in their organization"
ON public.feedback_status_history FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Feedback communications policies
CREATE POLICY "Users can view feedback communications in their organization"
ON public.feedback_communications FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert feedback communications in their organization"
ON public.feedback_communications FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update feedback communications in their organization"
ON public.feedback_communications FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete feedback communications in their organization"
ON public.feedback_communications FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Feedback notes policies
CREATE POLICY "Users can view feedback notes in their organization"
ON public.feedback_notes FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert feedback notes in their organization"
ON public.feedback_notes FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update feedback notes in their organization"
ON public.feedback_notes FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete feedback notes in their organization"
ON public.feedback_notes FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Project Kobo tables policies
CREATE POLICY "Users can view project kobo tables in their organization"
ON public.project_kobo_tables FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert project kobo tables in their organization"
ON public.project_kobo_tables FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update project kobo tables in their organization"
ON public.project_kobo_tables FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete project kobo tables in their organization"
ON public.project_kobo_tables FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Kobo KPI mappings policies
CREATE POLICY "Users can view kobo kpi mappings in their organization"
ON public.kobo_kpi_mappings FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert kobo kpi mappings in their organization"
ON public.kobo_kpi_mappings FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update kobo kpi mappings in their organization"
ON public.kobo_kpi_mappings FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete kobo kpi mappings in their organization"
ON public.kobo_kpi_mappings FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- User roles policies
CREATE POLICY "Users can view user roles in their organization"
ON public.user_roles FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert user roles in their organization"
ON public.user_roles FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update user roles in their organization"
ON public.user_roles FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete user roles in their organization"
ON public.user_roles FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- User permissions policies
CREATE POLICY "Users can view user permissions in their organization"
ON public.user_permissions FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert user permissions in their organization"
ON public.user_permissions FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update user permissions in their organization"
ON public.user_permissions FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete user permissions in their organization"
ON public.user_permissions FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- User project access policies
CREATE POLICY "Users can view user project access in their organization"
ON public.user_project_access FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert user project access in their organization"
ON public.user_project_access FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update user project access in their organization"
ON public.user_project_access FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete user project access in their organization"
ON public.user_project_access FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Sub activities policies
CREATE POLICY "Users can view sub activities in their organization"
ON public.sub_activities FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert sub activities in their organization"
ON public.sub_activities FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update sub activities in their organization"
ON public.sub_activities FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete sub activities in their organization"
ON public.sub_activities FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Milestones policies
CREATE POLICY "Users can view milestones in their organization"
ON public.milestones FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert milestones in their organization"
ON public.milestones FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update milestones in their organization"
ON public.milestones FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete milestones in their organization"
ON public.milestones FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Form workflows policies
CREATE POLICY "Users can view form workflows in their organization"
ON public.form_workflows FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert form workflows in their organization"
ON public.form_workflows FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update form workflows in their organization"
ON public.form_workflows FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete form workflows in their organization"
ON public.form_workflows FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Form analytics policies
CREATE POLICY "Users can view form analytics in their organization"
ON public.form_analytics FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert form analytics in their organization"
ON public.form_analytics FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update form analytics in their organization"
ON public.form_analytics FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete form analytics in their organization"
ON public.form_analytics FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Form permissions policies
CREATE POLICY "Users can view form permissions in their organization"
ON public.form_permissions FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert form permissions in their organization"
ON public.form_permissions FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update form permissions in their organization"
ON public.form_permissions FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete form permissions in their organization"
ON public.form_permissions FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Report approval steps policies
CREATE POLICY "Users can view report approval steps in their organization"
ON public.report_approval_steps FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert report approval steps in their organization"
ON public.report_approval_steps FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update report approval steps in their organization"
ON public.report_approval_steps FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete report approval steps in their organization"
ON public.report_approval_steps FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Report comments policies
CREATE POLICY "Users can view report comments in their organization"
ON public.report_comments FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert report comments in their organization"
ON public.report_comments FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update report comments in their organization"
ON public.report_comments FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete report comments in their organization"
ON public.report_comments FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Report workflow status history policies
CREATE POLICY "Users can view report workflow status history in their organization"
ON public.report_workflow_status_history FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert report workflow status history in their organization"
ON public.report_workflow_status_history FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update report workflow status history in their organization"
ON public.report_workflow_status_history FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete report workflow status history in their organization"
ON public.report_workflow_status_history FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Report workflow versions policies
CREATE POLICY "Users can view report workflow versions in their organization"
ON public.report_workflow_versions FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert report workflow versions in their organization"
ON public.report_workflow_versions FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update report workflow versions in their organization"
ON public.report_workflow_versions FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete report workflow versions in their organization"
ON public.report_workflow_versions FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Strategic plans policies
CREATE POLICY "Users can view strategic plans in their organization"
ON public.strategic_plans FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert strategic plans in their organization"
ON public.strategic_plans FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update strategic plans in their organization"
ON public.strategic_plans FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete strategic plans in their organization"
ON public.strategic_plans FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Strategic goals policies
CREATE POLICY "Users can view strategic goals in their organization"
ON public.strategic_goals FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert strategic goals in their organization"
ON public.strategic_goals FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update strategic goals in their organization"
ON public.strategic_goals FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete strategic goals in their organization"
ON public.strategic_goals FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Strategic subgoals policies
CREATE POLICY "Users can view strategic subgoals in their organization"
ON public.strategic_subgoals FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert strategic subgoals in their organization"
ON public.strategic_subgoals FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update strategic subgoals in their organization"
ON public.strategic_subgoals FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete strategic subgoals in their organization"
ON public.strategic_subgoals FOR DELETE
USING (organizationId = public.get_user_organization_id());

-- Strategic KPIs policies
CREATE POLICY "Users can view strategic kpis in their organization"
ON public.strategic_kpis FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can insert strategic kpis in their organization"
ON public.strategic_kpis FOR INSERT
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can update strategic kpis in their organization"
ON public.strategic_kpis FOR UPDATE
USING (organizationId = public.get_user_organization_id())
WITH CHECK (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can delete strategic kpis in their organization"
ON public.strategic_kpis FOR DELETE
USING (organizationId = public.get_user_organization_id());

