-- Migration: Fix subscription_plans table - Remove unique constraint on tierName
-- This allows monthly and annual plans to share the same tier name

ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS "subscription_plans_tierName_key";
