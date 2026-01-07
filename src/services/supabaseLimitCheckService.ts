
import { supabase } from '@/lib/supabaseClient';
import { supabaseAuthService } from './supabaseAuthService';
import { UsageMetric } from './supabaseUsageTrackingService';
import { getCurrentUserOrganizationId } from './getCurrentUserOrganizationId';

export interface LimitCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  message?: string;
}

export interface UsageLimitInfo {
  metric: UsageMetric;
  currentUsage: number;
  limit: number;
  remaining: number;
  percentage: number;
  isUnlimited: boolean;
  isAtLimit: boolean;
  isNearLimit: boolean; // Within 80% of limit
}

class SupabaseLimitCheckService {
  /**
   * Get current user's organizationId (uses shared cache helper)
   */
  private async getCurrentUserOrganizationId(): Promise<string> {
    return getCurrentUserOrganizationId();
  }

  /**
   * Check if an operation is allowed based on subscription limits
   * Uses the database function can_perform_operation for comprehensive checking
   */
  async checkLimit(
    metric: UsageMetric,
    operation: 'create' | 'update' = 'create'
  ): Promise<LimitCheckResult> {
    try {
      const organizationId = await this.getCurrentUserOrganizationId();

      // Call database function to check if operation is allowed
      const { data, error } = await supabase.rpc('can_perform_operation', {
        p_org_id: organizationId,
        p_metric: metric,
        p_operation: operation,
      });

      if (error) {
        console.error('Error checking limit:', error);
        // On error, default to blocking (fail-safe)
        return {
          allowed: false,
          currentUsage: 0,
          limit: 0,
          remaining: 0,
          isUnlimited: false,
          message: 'Unable to verify subscription limits. Please contact support.',
        };
      }

      // Get current usage and limit details
      const usageInfo = await this.getUsageLimitInfo(metric);

      return {
        allowed: data === true,
        currentUsage: usageInfo.currentUsage,
        limit: usageInfo.limit,
        remaining: usageInfo.remaining,
        isUnlimited: usageInfo.isUnlimited,
        message: data === false 
          ? this.getLimitExceededMessage(metric, usageInfo)
          : undefined,
      };
    } catch (error: any) {
      console.error('Error in checkLimit:', error);
      return {
        allowed: false,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        isUnlimited: false,
        message: error.message || 'Unable to verify subscription limits.',
      };
    }
  }

  /**
   * Get detailed usage and limit information for a metric
   */
  async getUsageLimitInfo(metric: UsageMetric): Promise<UsageLimitInfo> {
    try {
      const organizationId = await this.getCurrentUserOrganizationId();

      // Get current usage
      const { data: usageData, error: usageError } = await supabase
        .from('subscription_usage')
        .select('count, periodStart, periodEnd')
        .eq('organizationid', organizationId)
        .eq('metric', metric)
        .order('periodStart', { ascending: false })
        .limit(1)
        .single();

      const currentUsage = usageData?.count || 0;

      // Get organization's tier first, then get limit
      let limit = -1; // Default to unlimited
      
      // Try to get tier from RPC function (most accurate)
      const { data: tierName } = await supabase.rpc('get_organization_tier', {
        p_org_id: organizationId,
      });

      if (tierName) {
        const { data: limitData } = await supabase.rpc('get_plan_limit', {
          p_plan_code_or_tier: tierName,
          p_metric: metric,
        });
        limit = limitData ?? -1;
      } else {
        // Fallback: get tier from organization table directly
        const { data: orgData } = await supabase
          .from('organizations')
          .select('subscriptionTier')
          .eq('id', organizationId)
          .single();

        if (orgData?.subscriptionTier) {
          const { data: tierLimit } = await supabase.rpc('get_plan_limit', {
            p_plan_code_or_tier: orgData.subscriptionTier,
            p_metric: metric,
          });
          limit = tierLimit ?? -1;
        }
      }

      const isUnlimited = limit === -1;
      const remaining = isUnlimited ? Infinity : Math.max(0, limit - currentUsage);
      const percentage = isUnlimited ? 0 : limit > 0 ? (currentUsage / limit) * 100 : 0;
      const isAtLimit = !isUnlimited && currentUsage >= limit;
      const isNearLimit = !isUnlimited && percentage >= 80;

      return {
        metric,
        currentUsage,
        limit,
        remaining,
        percentage: Math.round(percentage),
        isUnlimited,
        isAtLimit,
        isNearLimit,
      };
    } catch (error: any) {
      console.error('Error getting usage limit info:', error);
      // Return safe defaults
      return {
        metric,
        currentUsage: 0,
        limit: -1,
        remaining: Infinity,
        percentage: 0,
        isUnlimited: true,
        isAtLimit: false,
        isNearLimit: false,
      };
    }
  }

  /**
   * Get usage limit info for all metrics
   */
  async getAllUsageLimitInfo(): Promise<UsageLimitInfo[]> {
    const metrics: UsageMetric[] = [
      'users',
      'projects',
      'forms',
      'form_responses',
      'reports',
      'feedback_forms',
      'kobo_tables',
      'strategic_plans',
      'storage_gb',
    ];

    const results = await Promise.all(
      metrics.map(metric => this.getUsageLimitInfo(metric))
    );

    return results;
  }

  /**
   * Get user-friendly error message when limit is exceeded
   */
  private getLimitExceededMessage(metric: UsageMetric, usageInfo: UsageLimitInfo): string {
    const metricNames: Record<UsageMetric, string> = {
      users: 'users',
      projects: 'projects',
      forms: 'forms',
      form_responses: 'form responses',
      reports: 'reports',
      feedback_forms: 'feedback forms',
      feedback_submissions: 'feedback submissions',
      kobo_tables: 'Kobo table integrations',
      strategic_plans: 'strategic plans',
      storage_gb: 'storage',
    };

    const metricName = metricNames[metric] || metric;
    const limitText = usageInfo.isUnlimited ? 'unlimited' : usageInfo.limit.toString();

    return `You have reached your ${metricName} limit (${usageInfo.currentUsage}/${limitText}). Please upgrade your plan to continue.`;
  }

  /**
   * Check if organization has active subscription
   */
  async hasActiveSubscription(): Promise<boolean> {
    try {
      const organizationId = await this.getCurrentUserOrganizationId();

      const { data, error } = await supabase.rpc('has_active_subscription', {
        p_org_id: organizationId,
      });

      if (error) {
        console.error('Error checking active subscription:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in hasActiveSubscription:', error);
      return false;
    }
  }

  /**
   * Get plan details including display name and subscription status
   */
  async getPlanDetails(): Promise<{
    displayName: string;
    tierName: string;
    status: string;
    isAnnual: boolean;
  } | null> {
    try {
      const organizationId = await this.getCurrentUserOrganizationId();

      // Get organization's subscription status as fallback (especially for free plans)
      const { data: organization } = await supabase
        .from('organizations')
        .select('subscriptionStatus, subscriptionTier')
        .eq('id', organizationId)
        .single();

      const orgSubscriptionStatus = organization?.subscriptionStatus || 'inactive';

      // Get plan code from subscription
      const { data: planCode } = await supabase.rpc('get_organization_plan_code', {
        p_org_id: organizationId,
      });

      if (!planCode) {
        // Fallback to tier name
        const { data: tierName } = await supabase.rpc('get_organization_tier', {
          p_org_id: organizationId,
        });

        if (!tierName) {
          return null;
        }

        // Get plan by tier name (get monthly version)
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('displayName, tierName, isAnnual')
          .eq('tierName', tierName)
          .eq('isActive', true)
          .eq('isAnnual', false)
          .limit(1)
          .single();

        if (!plan) {
          return null;
        }

        // Get subscription status from subscriptions table
        // For free plans, there might not be a subscription record, so use org status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('organizationid', organizationId)
          .maybeSingle();

        // Use subscription status if available, otherwise fall back to organization's subscriptionStatus
        const status = subscription?.status || orgSubscriptionStatus;

        return {
          displayName: plan.displayName,
          tierName: plan.tierName,
          status: status,
          isAnnual: plan.isAnnual ?? false,
        };
      }

      // Get plan by plan code
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('displayName, tierName, isAnnual')
        .eq('planCode', planCode)
        .eq('isActive', true)
        .limit(1)
        .single();

      if (!plan) {
        return null;
      }

      // Get subscription status from subscriptions table
      // For free plans, there might not be a subscription record, so use org status
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('organizationid', organizationId)
        .maybeSingle();

      // Use subscription status if available, otherwise fall back to organization's subscriptionStatus
      const status = subscription?.status || orgSubscriptionStatus;

      return {
        displayName: plan.displayName,
        tierName: plan.tierName,
        status: status,
        isAnnual: plan.isAnnual ?? false,
      };
    } catch (error) {
      console.error('Error getting plan details:', error);
      return null;
    }
  }
}

export const supabaseLimitCheckService = new SupabaseLimitCheckService();
