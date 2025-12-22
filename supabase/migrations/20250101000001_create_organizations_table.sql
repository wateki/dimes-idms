-- Migration: Create organizations table for multi-tenant support
-- This table stores organization/tenant information
-- Note: Uses text for id to match existing schema convention (all ids are text)

CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255) UNIQUE,
  "logoUrl" TEXT,
  settings JSONB DEFAULT '{}',
  "subscriptionTier" VARCHAR(50) DEFAULT 'free',
  "subscriptionStatus" VARCHAR(50) DEFAULT 'active',
  "subscriptionExpiresAt" TIMESTAMP,
  "maxUsers" INTEGER DEFAULT 10,
  "maxProjects" INTEGER DEFAULT 5,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "createdBy" TEXT REFERENCES public.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON public.organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations("isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON public.organizations("subscriptionStatus");

-- Add comments
COMMENT ON TABLE public.organizations IS 'Organizations/tenants in the multi-tenant SaaS system';
COMMENT ON COLUMN public.organizations.slug IS 'URL-friendly identifier for the organization';
COMMENT ON COLUMN public.organizations.domain IS 'Optional custom domain for the organization';
COMMENT ON COLUMN public.organizations.settings IS 'Organization-specific settings stored as JSON';
COMMENT ON COLUMN public.organizations."subscriptionTier" IS 'Subscription tier: free, basic, pro, enterprise';
COMMENT ON COLUMN public.organizations."subscriptionStatus" IS 'Subscription status: active, suspended, cancelled, past_due, trialing';

