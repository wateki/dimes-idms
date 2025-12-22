-- Migration: Create subscription and usage tracking tables
-- These tables support billing and subscription management for organizations
-- Note: Uses text type and camelCase to match existing schema

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organizationId TEXT REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  currentPeriodStart TIMESTAMP,
  currentPeriodEnd TIMESTAMP,
  cancelAtPeriodEnd BOOLEAN DEFAULT false,
  stripeSubscriptionId VARCHAR(255),
  stripeCustomerId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_organizationId ON public.subscriptions(organizationId);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripeSubscriptionId);

-- Subscription usage table
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organizationId TEXT REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  metric VARCHAR(50) NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  periodStart TIMESTAMP NOT NULL,
  periodEnd TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(organizationId, metric, periodStart, periodEnd)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_usage_organizationId ON public.subscription_usage(organizationId);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_metric ON public.subscription_usage(metric);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_period ON public.subscription_usage(periodStart, periodEnd);

-- Add comments
COMMENT ON TABLE public.subscriptions IS 'Organization subscription information for billing and tier management';
COMMENT ON TABLE public.subscription_usage IS 'Tracks usage metrics per organization for billing and limit enforcement';
COMMENT ON COLUMN public.subscriptions.tier IS 'Subscription tier: free, basic, pro, enterprise';
COMMENT ON COLUMN public.subscriptions.status IS 'Subscription status: active, cancelled, past_due, trialing, paused';
COMMENT ON COLUMN public.subscription_usage.metric IS 'Usage metric: users, projects, storage_gb, api_calls, etc.';

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view subscriptions in their organization"
ON public.subscriptions FOR SELECT
USING (organizationId = public.get_user_organization_id());

CREATE POLICY "Users can view subscription usage in their organization"
ON public.subscription_usage FOR SELECT
USING (organizationId = public.get_user_organization_id());
