-- Migration: Create subscription plans and plan metrics tables
-- This allows dynamic configuration of tier limits and feature access

-- Subscription Plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "planCode" TEXT UNIQUE NOT NULL, -- Paystack plan code (e.g., PLN_FREE, PLN_5jjsgz1ivndtnxp)
  "tierName" VARCHAR(50) NOT NULL, -- free, basic, professional, enterprise (not unique to allow monthly/annual variants)
  "displayName" VARCHAR(100) NOT NULL, -- "Free Plan", "Basic Plan", etc.
  "description" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "isAnnual" BOOLEAN DEFAULT false, -- Whether this is an annual plan
  "monthlyPlanCode" TEXT, -- Reference to monthly version if this is annual
  "annualPlanCode" TEXT, -- Reference to annual version if this is monthly
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Plan Metrics table - defines limits and features per plan
CREATE TABLE IF NOT EXISTS public.plan_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "planId" TEXT REFERENCES public.subscription_plans(id) ON DELETE CASCADE NOT NULL,
  "metricName" VARCHAR(50) NOT NULL, -- users, projects, forms, form_responses, etc.
  "limitValue" INTEGER NOT NULL, -- -1 for unlimited, 0 for not available, >0 for specific limit
  "isEnabled" BOOLEAN DEFAULT true, -- Whether this feature is available in this plan
  "description" TEXT, -- Description of the limit/feature
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("planId", "metricName")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON public.subscription_plans("tierName");
CREATE INDEX IF NOT EXISTS idx_subscription_plans_code ON public.subscription_plans("planCode");
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans("isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_plan_metrics_plan ON public.plan_metrics("planId");
CREATE INDEX IF NOT EXISTS idx_plan_metrics_metric ON public.plan_metrics("metricName");
CREATE INDEX IF NOT EXISTS idx_plan_metrics_enabled ON public.plan_metrics("isEnabled") WHERE "isEnabled" = true;

-- Add comments
COMMENT ON TABLE public.subscription_plans IS 'Subscription plans/tiers configuration. Allows dynamic management of plan limits and features.';
COMMENT ON TABLE public.plan_metrics IS 'Defines limits and feature availability for each subscription plan. Links plans to specific metrics (users, projects, forms, etc.).';
COMMENT ON COLUMN public.subscription_plans."planCode" IS 'Paystack plan code identifier';
COMMENT ON COLUMN public.subscription_plans."tierName" IS 'Internal tier identifier: free, basic, professional, enterprise';
COMMENT ON COLUMN public.plan_metrics."limitValue" IS 'Limit for this metric: -1 = unlimited, 0 = not available, >0 = specific limit';
COMMENT ON COLUMN public.plan_metrics."isEnabled" IS 'Whether this feature/metric is available in this plan';

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Plans are readable by all authenticated users
CREATE POLICY "Users can view subscription plans"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can view plan metrics"
ON public.plan_metrics FOR SELECT
TO authenticated
USING (true);
