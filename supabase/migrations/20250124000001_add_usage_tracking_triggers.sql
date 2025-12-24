-- Migration: Add database-level usage tracking triggers
-- This implements the hybrid approach: triggers for simple operations, service-level for complex logic
-- Note: All projects and forms are tracked (active and archived) as they occupy resources

-- ========================================
-- Helper Functions
-- ========================================

-- Function to get current billing period (monthly)
-- NOTE: This is kept for backward compatibility. Use get_organization_billing_period() for subscription-aware periods.
CREATE OR REPLACE FUNCTION get_current_billing_period()
RETURNS TABLE(period_start TIMESTAMP, period_end TIMESTAMP) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('month', CURRENT_DATE)::timestamp as period_start,
    (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::timestamp as period_end;
END;
$$ LANGUAGE plpgsql;

-- Function to get organization's billing period based on subscription
-- Supports both monthly and annual subscriptions
CREATE OR REPLACE FUNCTION get_organization_billing_period(p_org_id TEXT)
RETURNS TABLE(period_start TIMESTAMP, period_end TIMESTAMP) AS $$
DECLARE
  v_subscription RECORD;
  v_plan_code TEXT;
  v_is_annual BOOLEAN;
BEGIN
  -- Get subscription details (ONLY active subscriptions)
  -- Usage tracking is only performed against active subscriptions
  SELECT 
    "currentPeriodStart",
    "currentPeriodEnd",
    paystackplancode
  INTO v_subscription
  FROM subscriptions
  WHERE organizationid = p_org_id
    AND status = 'active'  -- Only track usage for active subscriptions
  LIMIT 1;

  -- If subscription has explicit period dates, use them (most accurate)
  IF v_subscription."currentPeriodStart" IS NOT NULL 
     AND v_subscription."currentPeriodEnd" IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      v_subscription."currentPeriodStart" as period_start,
      v_subscription."currentPeriodEnd" as period_end;
    RETURN;
  END IF;

  -- Otherwise, determine period based on plan code
  v_plan_code := COALESCE(v_subscription.paystackplancode, '');
  
  -- Check if it's an annual plan code
  v_is_annual := (
    v_plan_code LIKE '%f5n4d3g6x7cb3or%' OR  -- Basic Annual: PLN_f5n4d3g6x7cb3or
    v_plan_code LIKE '%zekf4yw2rvdy957%' OR  -- Professional Annual: PLN_zekf4yw2rvdy957
    v_plan_code LIKE '%2w2w7d02awcarg9%'     -- Enterprise Annual: PLN_2w2w7d02awcarg9
  );

  IF v_is_annual THEN
    -- Annual billing: current year (Jan 1 to Dec 31)
    RETURN QUERY
    SELECT 
      date_trunc('year', CURRENT_DATE)::timestamp as period_start,
      (date_trunc('year', CURRENT_DATE) + interval '1 year' - interval '1 day')::timestamp as period_end;
  ELSE
    -- Monthly billing: current month (default)
    RETURN QUERY
    SELECT 
      date_trunc('month', CURRENT_DATE)::timestamp as period_start,
      (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::timestamp as period_end;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage metric
CREATE OR REPLACE FUNCTION increment_usage_metric(
  p_org_id TEXT,
  p_metric VARCHAR(50)
) RETURNS VOID AS $$
DECLARE
  v_period_start TIMESTAMP;
  v_period_end TIMESTAMP;
BEGIN
  -- Get billing period based on subscription (annual or monthly)
  SELECT period_start, period_end INTO v_period_start, v_period_end
  FROM get_organization_billing_period(p_org_id);
  
  -- Upsert usage record (using correct column name: organizationid lowercase)
  INSERT INTO subscription_usage (organizationid, metric, count, "periodStart", "periodEnd")
  VALUES (p_org_id, p_metric, 1, v_period_start, v_period_end)
  ON CONFLICT (organizationid, metric, "periodStart", "periodEnd")
  DO UPDATE SET count = subscription_usage.count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement usage metric
CREATE OR REPLACE FUNCTION decrement_usage_metric(
  p_org_id TEXT,
  p_metric VARCHAR(50)
) RETURNS VOID AS $$
DECLARE
  v_period_start TIMESTAMP;
  v_period_end TIMESTAMP;
BEGIN
  -- Get billing period based on subscription (annual or monthly)
  SELECT period_start, period_end INTO v_period_start, v_period_end
  FROM get_organization_billing_period(p_org_id);
  
  -- Update usage record (using correct column name: organizationid lowercase)
  UPDATE subscription_usage
  SET count = GREATEST(0, count - 1)
  WHERE organizationid = p_org_id
    AND metric = p_metric
    AND "periodStart" = v_period_start
    AND "periodEnd" = v_period_end;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Projects Triggers
-- ========================================
-- Track all projects (active and archived) as they occupy resources
-- Note: projects table uses "organizationId" (camelCase)

CREATE OR REPLACE FUNCTION track_project_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_metric(NEW."organizationid", 'projects');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_usage_metric(OLD."organizationid", 'projects');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_project_insert
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION track_project_usage();

CREATE TRIGGER track_project_delete
AFTER DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION track_project_usage();

-- ========================================
-- Forms Triggers
-- ========================================
-- Track all forms (active and archived) as they occupy resources
-- Note: forms table uses "organizationId" (camelCase) per migration 20250101000005

CREATE OR REPLACE FUNCTION track_form_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_metric(NEW."organizationid", 'forms');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_usage_metric(OLD."organizationid", 'forms');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_form_insert
AFTER INSERT ON forms
FOR EACH ROW
EXECUTE FUNCTION track_form_usage();

CREATE TRIGGER track_form_delete
AFTER DELETE ON forms
FOR EACH ROW
EXECUTE FUNCTION track_form_usage();

-- ========================================
-- Form Responses Triggers
-- ========================================
-- Track all form responses (complete and incomplete) as submissions are typically made after completion
-- Note: form_responses table uses "organizationid" (lowercase) per migration 20250101000005

CREATE OR REPLACE FUNCTION track_form_response_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_metric(NEW."organizationid", 'form_responses');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_usage_metric(OLD."organizationid", 'form_responses');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_form_response_insert
AFTER INSERT ON form_responses
FOR EACH ROW
EXECUTE FUNCTION track_form_response_usage();

CREATE TRIGGER track_form_response_delete
AFTER DELETE ON form_responses
FOR EACH ROW
EXECUTE FUNCTION track_form_response_usage();

-- ========================================
-- Reports Triggers
-- ========================================
-- Note: reports table uses "organizationId" (camelCase) per migration 20250101000006

CREATE OR REPLACE FUNCTION track_report_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_metric(NEW."organizationid", 'reports');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_usage_metric(OLD."organizationid", 'reports');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_report_insert
AFTER INSERT ON reports
FOR EACH ROW
EXECUTE FUNCTION track_report_usage();

CREATE TRIGGER track_report_delete
AFTER DELETE ON reports
FOR EACH ROW
EXECUTE FUNCTION track_report_usage();

-- ========================================
-- Feedback Forms Triggers
-- ========================================
-- Note: feedback_forms table uses "organizationId" (camelCase) per migration 20250101000007

CREATE OR REPLACE FUNCTION track_feedback_form_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_metric(NEW."organizationid", 'feedback_forms');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_usage_metric(OLD."organizationid", 'feedback_forms');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_feedback_form_insert
AFTER INSERT ON feedback_forms
FOR EACH ROW
EXECUTE FUNCTION track_feedback_form_usage();

CREATE TRIGGER track_feedback_form_delete
AFTER DELETE ON feedback_forms
FOR EACH ROW
EXECUTE FUNCTION track_feedback_form_usage();

-- ========================================
-- Feedback Submissions Triggers
-- ========================================
-- Note: feedback_submissions table uses "organizationId" (camelCase) per migration 20250101000007

CREATE OR REPLACE FUNCTION track_feedback_submission_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_metric(NEW."organizationid", 'feedback_submissions');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_usage_metric(OLD."organizationid", 'feedback_submissions');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_feedback_submission_insert
AFTER INSERT ON feedback_submissions
FOR EACH ROW
EXECUTE FUNCTION track_feedback_submission_usage();

CREATE TRIGGER track_feedback_submission_delete
AFTER DELETE ON feedback_submissions
FOR EACH ROW
EXECUTE FUNCTION track_feedback_submission_usage();

-- ========================================
-- Kobo Tables Triggers
-- ========================================

CREATE OR REPLACE FUNCTION track_kobo_table_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_metric(NEW."organizationid", 'kobo_tables');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_usage_metric(OLD."organizationid", 'kobo_tables');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_kobo_table_insert
AFTER INSERT ON project_kobo_tables
FOR EACH ROW
EXECUTE FUNCTION track_kobo_table_usage();

CREATE TRIGGER track_kobo_table_delete
AFTER DELETE ON project_kobo_tables
FOR EACH ROW
EXECUTE FUNCTION track_kobo_table_usage();

-- ========================================
-- Strategic Plans Triggers
-- ========================================
-- Note: strategic_plans table uses "organizationId" (camelCase) per migration 20250101000009b

CREATE OR REPLACE FUNCTION track_strategic_plan_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage_metric(NEW."organizationid", 'strategic_plans');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_usage_metric(OLD."organizationid", 'strategic_plans');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_strategic_plan_insert
AFTER INSERT ON strategic_plans
FOR EACH ROW
EXECUTE FUNCTION track_strategic_plan_usage();

CREATE TRIGGER track_strategic_plan_delete
AFTER DELETE ON strategic_plans
FOR EACH ROW
EXECUTE FUNCTION track_strategic_plan_usage();

-- ========================================
-- Comments
-- ========================================

COMMENT ON FUNCTION increment_usage_metric IS 'Increments usage count for a metric in the organization''s billing period (monthly or annual based on subscription)';
COMMENT ON FUNCTION decrement_usage_metric IS 'Decrements usage count for a metric in the organization''s billing period (monthly or annual based on subscription)';
COMMENT ON FUNCTION get_current_billing_period IS 'Returns the start and end timestamps for the current monthly billing period (kept for backward compatibility)';
COMMENT ON FUNCTION get_organization_billing_period IS 'Returns the billing period (monthly or annual) for an organization based on their subscription. Uses subscription period dates if available, otherwise determines from plan code.';

