-- Migration: Update access control functions to use subscription_plans and plan_metrics tables
-- This replaces hardcoded tier limits with dynamic configuration from the database

-- Drop old functions
DROP FUNCTION IF EXISTS public.get_tier_limit(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.can_perform_operation(TEXT, TEXT, TEXT);

-- New function to get plan limit from plan_metrics table
-- This function looks up limits based on plan code or tier name
CREATE OR REPLACE FUNCTION public.get_plan_limit(
  p_plan_code_or_tier TEXT,
  p_metric TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_limit INTEGER;
  v_plan_id TEXT;
BEGIN
  -- Try to find plan by plan code first
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE "planCode" = p_plan_code_or_tier
    AND "isActive" = true
  LIMIT 1;
  
  -- If not found by plan code, try by tier name (get monthly plan)
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id
    FROM subscription_plans
    WHERE "tierName" = p_plan_code_or_tier
      AND "isActive" = true
      AND "isAnnual" = false
    LIMIT 1;
  END IF;
  
  -- If still not found, return 0 (no access)
  IF v_plan_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get limit from plan_metrics
  SELECT "limitValue" INTO v_limit
  FROM plan_metrics
  WHERE "planId" = v_plan_id
    AND "metricName" = p_metric
    AND "isEnabled" = true
  LIMIT 1;
  
  -- If metric not found or not enabled, return 0
  RETURN COALESCE(v_limit, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to get organization's plan code from subscription
CREATE OR REPLACE FUNCTION public.get_organization_plan_code(p_org_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_plan_code TEXT;
BEGIN
  SELECT paystackplancode INTO v_plan_code
  FROM subscriptions
  WHERE organizationid = p_org_id
    AND status = 'active'
  LIMIT 1;
  
  RETURN v_plan_code;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to get organization's tier name from subscription
CREATE OR REPLACE FUNCTION public.get_organization_tier(p_org_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_plan_code TEXT;
  v_tier_name TEXT;
BEGIN
  -- Get plan code from subscription
  v_plan_code := get_organization_plan_code(p_org_id);
  
  -- If no plan code, check organization's subscriptionTier
  IF v_plan_code IS NULL THEN
    SELECT "subscriptionTier" INTO v_tier_name
    FROM organizations
    WHERE id = p_org_id
    LIMIT 1;
    
    RETURN COALESCE(v_tier_name, 'free');
  END IF;
  
  -- Get tier name from plan code
  SELECT "tierName" INTO v_tier_name
  FROM subscription_plans
  WHERE "planCode" = v_plan_code
    AND "isActive" = true
  LIMIT 1;
  
  -- Fallback to organization's subscriptionTier if plan not found
  IF v_tier_name IS NULL THEN
    SELECT "subscriptionTier" INTO v_tier_name
    FROM organizations
    WHERE id = p_org_id
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(v_tier_name, 'free');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Updated comprehensive function to check if operation is allowed
-- Now uses plan_metrics table for limits
CREATE OR REPLACE FUNCTION public.can_perform_operation(
  p_org_id TEXT,
  p_metric TEXT,
  p_operation TEXT DEFAULT 'create' -- 'create' or 'update'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_active BOOLEAN;
  v_plan_code TEXT;
  v_tier_name TEXT;
  v_limit INTEGER;
  v_current_usage INTEGER;
  v_period_start TIMESTAMP;
  v_period_end TIMESTAMP;
BEGIN
  -- Step 1: Check if organization has active subscription
  SELECT EXISTS(
    SELECT 1
    FROM subscriptions
    WHERE organizationid = p_org_id
      AND status = 'active'
  ) INTO v_has_active;
  
  -- If no active subscription, block operation
  IF NOT v_has_active THEN
    RETURN false;
  END IF;
  
  -- Step 2: Get organization's plan code
  v_plan_code := get_organization_plan_code(p_org_id);
  
  -- Step 3: Get tier name (fallback if plan code not found)
  v_tier_name := get_organization_tier(p_org_id);
  
  -- Step 4: Get limit from plan_metrics table
  -- Try plan code first, then tier name
  IF v_plan_code IS NOT NULL THEN
    v_limit := get_plan_limit(v_plan_code, p_metric);
  ELSE
    v_limit := get_plan_limit(v_tier_name, p_metric);
  END IF;
  
  -- If limit is -1 (unlimited), allow operation
  IF v_limit = -1 THEN
    RETURN true;
  END IF;
  
  -- If limit is 0 (not available), block operation
  IF v_limit = 0 THEN
    RETURN false;
  END IF;
  
  -- Step 5: Get current billing period
  SELECT period_start, period_end
  INTO v_period_start, v_period_end
  FROM get_organization_billing_period(p_org_id)
  LIMIT 1;
  
  -- Step 6: Get current usage for this metric in current period
  SELECT COALESCE(count, 0)
  INTO v_current_usage
  FROM subscription_usage
  WHERE organizationid = p_org_id
    AND metric = p_metric
    AND "periodStart" = v_period_start
    AND "periodEnd" = v_period_end
  LIMIT 1;
  
  -- If no usage record exists, current usage is 0
  v_current_usage := COALESCE(v_current_usage, 0);
  
  -- Step 7: For 'create' operations, check if adding 1 would exceed limit
  -- For 'update' operations, check current usage (updates don't increase count)
  IF p_operation = 'create' THEN
    -- Block if current usage + 1 would exceed limit
    RETURN (v_current_usage + 1) <= v_limit;
  ELSE
    -- For updates, allow if current usage is within limit
    RETURN v_current_usage <= v_limit;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_plan_limit(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_plan_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_tier(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_perform_operation(TEXT, TEXT, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.get_plan_limit IS 'Gets the limit for a metric from plan_metrics table. Returns -1 for unlimited, 0 for not available, or specific limit value.';
COMMENT ON FUNCTION public.get_organization_plan_code IS 'Gets the active subscription plan code for an organization.';
COMMENT ON FUNCTION public.get_organization_tier IS 'Gets the subscription tier name for an organization, with fallback to organization.subscriptionTier.';
COMMENT ON FUNCTION public.can_perform_operation IS 'Comprehensive access control: checks active subscription, tier limits from plan_metrics table, and current usage. Returns true if operation is allowed, false otherwise.';
