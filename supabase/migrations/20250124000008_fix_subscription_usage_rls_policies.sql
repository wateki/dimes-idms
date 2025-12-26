-- Migration: Add INSERT and UPDATE policies for subscription_usage table
-- The usage tracking triggers need to INSERT/UPDATE records, but RLS was blocking them
-- This was causing RLS errors (42501) that were incorrectly interpreted as limit errors

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can insert subscription usage in their organization" ON public.subscription_usage;
DROP POLICY IF EXISTS "Users can update subscription usage in their organization" ON public.subscription_usage;

-- Add INSERT policy for subscription_usage
-- Allows users to insert usage records for their organization (needed by triggers)
CREATE POLICY "Users can insert subscription usage in their organization"
ON public.subscription_usage FOR INSERT
WITH CHECK (organizationid = public.get_user_organization_id());

-- Add UPDATE policy for subscription_usage
-- Allows users to update usage records for their organization (needed by triggers with ON CONFLICT DO UPDATE)
CREATE POLICY "Users can update subscription usage in their organization"
ON public.subscription_usage FOR UPDATE
USING (organizationid = public.get_user_organization_id())
WITH CHECK (organizationid = public.get_user_organization_id());

-- Grant execute permissions to authenticated role for trigger functions
-- These functions are called by triggers, which run in the context of the authenticated user
GRANT EXECUTE ON FUNCTION public.increment_usage_metric(TEXT, VARCHAR(50)) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_usage_metric(TEXT, VARCHAR(50)) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_billing_period(TEXT) TO authenticated;


