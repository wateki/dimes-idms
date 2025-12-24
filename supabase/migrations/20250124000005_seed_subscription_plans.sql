-- Migration: Seed subscription plans and plan metrics with current tier limits
-- This populates the plans table with Free, Basic, Professional, and Enterprise plans

-- Insert subscription plans
INSERT INTO public.subscription_plans ("planCode", "tierName", "displayName", "description", "isActive", "isAnnual", "monthlyPlanCode", "annualPlanCode")
VALUES
  -- Free Plan
  ('PLN_FREE', 'free', 'Free Plan', 'Free tier with basic features and limited resources', true, false, NULL, NULL),
  
  -- Basic Monthly
  ('PLN_5jjsgz1ivndtnxp', 'basic', 'Basic Plan (Monthly)', 'Basic tier with monthly billing', true, false, NULL, 'PLN_f5n4d3g6x7cb3or'),
  
  -- Basic Annual
  ('PLN_f5n4d3g6x7cb3or', 'basic', 'Basic Plan (Annual)', 'Basic tier with annual billing - Save 10%', true, true, 'PLN_5jjsgz1ivndtnxp', NULL),
  
  -- Professional Monthly
  ('PLN_a7qqm2p4q9ejdpt', 'professional', 'Professional Plan (Monthly)', 'Professional tier with monthly billing', true, false, NULL, 'PLN_zekf4yw2rvdy957'),
  
  -- Professional Annual
  ('PLN_zekf4yw2rvdy957', 'professional', 'Professional Plan (Annual)', 'Professional tier with annual billing - Save 10%', true, true, 'PLN_a7qqm2p4q9ejdpt', NULL),
  
  -- Enterprise Monthly
  ('PLN_9jsfo4c1d35od5q', 'enterprise', 'Enterprise Plan (Monthly)', 'Enterprise tier with monthly billing - Unlimited resources', true, false, NULL, 'PLN_2w2w7d02awcarg9'),
  
  -- Enterprise Annual
  ('PLN_2w2w7d02awcarg9', 'enterprise', 'Enterprise Plan (Annual)', 'Enterprise tier with annual billing - Unlimited resources, Save 10%', true, true, 'PLN_9jsfo4c1d35od5q', NULL)
ON CONFLICT ("planCode") DO NOTHING;

-- Helper function to get plan ID by tier name
CREATE OR REPLACE FUNCTION public.get_plan_id_by_tier(p_tier_name TEXT)
RETURNS TEXT AS $$
  SELECT id FROM public.subscription_plans WHERE "tierName" = p_tier_name AND "isAnnual" = false LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Insert plan metrics for Free Plan
DO $$
DECLARE
  v_free_plan_id TEXT;
BEGIN
  SELECT id INTO v_free_plan_id FROM public.subscription_plans WHERE "planCode" = 'PLN_FREE' LIMIT 1;
  
  INSERT INTO public.plan_metrics ("planId", "metricName", "limitValue", "isEnabled", "description")
  VALUES
    (v_free_plan_id, 'users', 5, true, 'Maximum 5 users'),
    (v_free_plan_id, 'projects', 3, true, 'Maximum 3 projects'),
    (v_free_plan_id, 'forms', 10, true, 'Maximum 10 active forms'),
    (v_free_plan_id, 'form_responses', 1000, true, 'Maximum 1,000 form responses per month'),
    (v_free_plan_id, 'reports', 10, true, 'Maximum 10 reports'),
    (v_free_plan_id, 'feedback_forms', 5, true, 'Maximum 5 feedback forms'),
    (v_free_plan_id, 'kobo_tables', 3, true, 'Maximum 3 Kobo table integrations'),
    (v_free_plan_id, 'strategic_plans', 1, true, 'Maximum 1 strategic plan')
  ON CONFLICT ("planId", "metricName") DO NOTHING;
END $$;

-- Insert plan metrics for Basic Plan (using monthly plan)
DO $$
DECLARE
  v_basic_plan_id TEXT;
BEGIN
  SELECT id INTO v_basic_plan_id FROM public.subscription_plans WHERE "planCode" = 'PLN_5jjsgz1ivndtnxp' LIMIT 1;
  
  INSERT INTO public.plan_metrics ("planId", "metricName", "limitValue", "isEnabled", "description")
  VALUES
    (v_basic_plan_id, 'users', 20, true, 'Maximum 20 users'),
    (v_basic_plan_id, 'projects', 10, true, 'Maximum 10 projects'),
    (v_basic_plan_id, 'forms', 50, true, 'Maximum 50 active forms'),
    (v_basic_plan_id, 'form_responses', 10000, true, 'Maximum 10,000 form responses per month'),
    (v_basic_plan_id, 'reports', 50, true, 'Maximum 50 reports'),
    (v_basic_plan_id, 'feedback_forms', 20, true, 'Maximum 20 feedback forms'),
    (v_basic_plan_id, 'kobo_tables', 10, true, 'Maximum 10 Kobo table integrations'),
    (v_basic_plan_id, 'strategic_plans', 5, true, 'Maximum 5 strategic plans')
  ON CONFLICT ("planId", "metricName") DO NOTHING;
END $$;

-- Insert plan metrics for Professional Plan (using monthly plan)
DO $$
DECLARE
  v_pro_plan_id TEXT;
BEGIN
  SELECT id INTO v_pro_plan_id FROM public.subscription_plans WHERE "planCode" = 'PLN_a7qqm2p4q9ejdpt' LIMIT 1;
  
  INSERT INTO public.plan_metrics ("planId", "metricName", "limitValue", "isEnabled", "description")
  VALUES
    (v_pro_plan_id, 'users', 50, true, 'Maximum 50 users'),
    (v_pro_plan_id, 'projects', 25, true, 'Maximum 25 projects'),
    (v_pro_plan_id, 'forms', 100, true, 'Maximum 100 active forms'),
    (v_pro_plan_id, 'form_responses', 50000, true, 'Maximum 50,000 form responses per month'),
    (v_pro_plan_id, 'reports', 100, true, 'Maximum 100 reports'),
    (v_pro_plan_id, 'feedback_forms', 50, true, 'Maximum 50 feedback forms'),
    (v_pro_plan_id, 'kobo_tables', 25, true, 'Maximum 25 Kobo table integrations'),
    (v_pro_plan_id, 'strategic_plans', 10, true, 'Maximum 10 strategic plans')
  ON CONFLICT ("planId", "metricName") DO NOTHING;
END $$;

-- Insert plan metrics for Enterprise Plan (using monthly plan)
DO $$
DECLARE
  v_enterprise_plan_id TEXT;
BEGIN
  SELECT id INTO v_enterprise_plan_id FROM public.subscription_plans WHERE "planCode" = 'PLN_9jsfo4c1d35od5q' LIMIT 1;
  
  INSERT INTO public.plan_metrics ("planId", "metricName", "limitValue", "isEnabled", "description")
  VALUES
    (v_enterprise_plan_id, 'users', -1, true, 'Unlimited users'),
    (v_enterprise_plan_id, 'projects', -1, true, 'Unlimited projects'),
    (v_enterprise_plan_id, 'forms', -1, true, 'Unlimited active forms'),
    (v_enterprise_plan_id, 'form_responses', -1, true, 'Unlimited form responses'),
    (v_enterprise_plan_id, 'reports', -1, true, 'Unlimited reports'),
    (v_enterprise_plan_id, 'feedback_forms', -1, true, 'Unlimited feedback forms'),
    (v_enterprise_plan_id, 'kobo_tables', -1, true, 'Unlimited Kobo table integrations'),
    (v_enterprise_plan_id, 'strategic_plans', -1, true, 'Unlimited strategic plans')
  ON CONFLICT ("planId", "metricName") DO NOTHING;
END $$;

-- Note: Annual plans inherit metrics from their monthly counterparts
-- We can add a function or trigger to sync metrics, or handle it in application logic
