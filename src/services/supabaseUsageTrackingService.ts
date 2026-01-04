import { supabase } from '@/lib/supabaseClient';
import { supabaseAuthService } from './supabaseAuthService';
import { getCurrentUserOrganizationId } from './getCurrentUserOrganizationId';

export type UsageMetric = 
  | 'users'
  | 'projects'
  | 'forms'
  | 'form_responses'
  | 'reports'
  | 'feedback_forms'
  | 'feedback_submissions'
  | 'kobo_tables'
  | 'strategic_plans'
  | 'storage_gb';

export interface UsageRecord {
  id: string;
  organizationId: string;
  metric: UsageMetric;
  count: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface CurrentUsage {
  metric: UsageMetric;
  count: number;
  periodStart: string;
  periodEnd: string;
}

class SupabaseUsageTrackingService {
  /**
   * Get current user's organizationId (uses shared cache helper)
   */
  private async getCurrentUserOrganizationId(): Promise<string> {
    return getCurrentUserOrganizationId();
  }

  /**
   * Get the current billing period based on subscription
   * Returns monthly period for monthly subscriptions, yearly for annual subscriptions
   * Note: This should match the database function get_organization_billing_period()
   */
  private async getCurrentPeriod(organizationId: string): Promise<{ periodStart: Date; periodEnd: Date }> {
    try {
      // Try to get ACTIVE subscription to determine billing period
      // Usage tracking is only performed against active subscriptions
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('currentPeriodStart, currentPeriodEnd, paystackplancode')
        .eq('organizationid', organizationId)
        .eq('status', 'active')  // Only use active subscriptions for tracking
        .single();

      // If subscription has explicit period dates, use them
      if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
        return {
          periodStart: new Date(subscription.currentPeriodStart),
          periodEnd: new Date(subscription.currentPeriodEnd),
        };
      }

      // Otherwise, determine from plan code
      const planCode = subscription?.paystackplancode || '';
      const isAnnual = 
        planCode.includes('f5n4d3g6x7cb3or') ||  // Basic Annual
        planCode.includes('zekf4yw2rvdy957') ||  // Professional Annual
        planCode.includes('2w2w7d02awcarg9');    // Enterprise Annual

      if (isAnnual) {
        // Annual billing: current year (Jan 1 to Dec 31)
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), 0, 1);
        const periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { periodStart, periodEnd };
      } else {
        // Monthly billing: current month
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { periodStart, periodEnd };
      }
    } catch (error) {
      // Fallback to monthly if subscription lookup fails
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { periodStart, periodEnd };
    }
  }

  /**
   * Get or create usage record for current period
   */
  private async getOrCreateUsageRecord(
    organizationId: string,
    metric: UsageMetric
  ): Promise<UsageRecord> {
    const { periodStart, periodEnd } = await this.getCurrentPeriod(organizationId);

    // Try to get existing record
    const { data: existing, error: fetchError } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('organizationid', organizationId)
      .eq('metric', metric)
      .eq('periodStart', periodStart.toISOString())
      .eq('periodEnd', periodEnd.toISOString())
      .single();

    if (existing && !fetchError) {
      return {
        ...existing,
        organizationId: existing.organizationid,
      } as UsageRecord;
    }

    // Create new record if it doesn't exist
    const { data: newRecord, error: createError } = await supabase
      .from('subscription_usage')
      .insert({
        organizationid: organizationId,
        metric,
        count: 0,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      })
      .select()
      .single();

    if (createError || !newRecord) {
      throw new Error(
        `Failed to create usage record: ${createError?.message || 'Unknown error'}`
      );
    }

    return {
      ...newRecord,
      organizationId: newRecord.organizationid,
    } as UsageRecord;
  }

  /**
   * Increment usage count for a metric
   */
  async incrementUsage(metric: UsageMetric, amount: number = 1): Promise<void> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const record = await this.getOrCreateUsageRecord(organizationId, metric);

    const { error } = await supabase
      .from('subscription_usage')
      .update({ count: record.count + amount })
      .eq('id', record.id);

    if (error) {
      throw new Error(`Failed to increment usage: ${error.message}`);
    }
  }

  /**
   * Decrement usage count for a metric
   */
  async decrementUsage(metric: UsageMetric, amount: number = 1): Promise<void> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const record = await this.getOrCreateUsageRecord(organizationId, metric);

    const newCount = Math.max(0, record.count - amount);

    const { error } = await supabase
      .from('subscription_usage')
      .update({ count: newCount })
      .eq('id', record.id);

    if (error) {
      throw new Error(`Failed to decrement usage: ${error.message}`);
    }
  }

  /**
   * Set usage count for a metric (for recalculation)
   */
  async setUsage(metric: UsageMetric, count: number): Promise<void> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const record = await this.getOrCreateUsageRecord(organizationId, metric);

    const { error } = await supabase
      .from('subscription_usage')
      .update({ count: Math.max(0, count) })
      .eq('id', record.id);

    if (error) {
      throw new Error(`Failed to set usage: ${error.message}`);
    }
  }

  /**
   * Get current usage for a metric
   */
  async getCurrentUsage(metric: UsageMetric): Promise<CurrentUsage | null> {
      const organizationId = await this.getCurrentUserOrganizationId();
      const { periodStart, periodEnd } = await this.getCurrentPeriod(organizationId);

    const { data, error } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('organizationId', organizationId)
      .eq('metric', metric)
      .eq('periodStart', periodStart.toISOString())
      .eq('periodEnd', periodEnd.toISOString())
      .single();

    if (error || !data) {
      // Return zero usage if no record exists
      return {
        metric,
        count: 0,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      };
    }

    return {
      metric: data.metric as UsageMetric,
      count: data.count,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
    };
  }

  /**
   * Get all current usage metrics for the organization
   */
  async getAllCurrentUsage(): Promise<Record<UsageMetric, CurrentUsage>> {
      const organizationId = await this.getCurrentUserOrganizationId();
      const { periodStart, periodEnd } = await this.getCurrentPeriod(organizationId);

    const { data, error } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('organizationId', organizationId)
      .eq('periodStart', periodStart.toISOString())
      .eq('periodEnd', periodEnd.toISOString());

    if (error) {
      throw new Error(`Failed to get usage: ${error.message}`);
    }

    const usageMap: Record<string, CurrentUsage> = {};
    const metrics: UsageMetric[] = [
      'users',
      'projects',
      'forms',
      'form_responses',
      'reports',
      'feedback_forms',
      'feedback_submissions',
      'kobo_tables',
      'strategic_plans',
      'storage_gb',
    ];

    // Initialize all metrics with zero
    metrics.forEach((metric) => {
      usageMap[metric] = {
        metric,
        count: 0,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      };
    });

    // Update with actual data
    (data || []).forEach((record) => {
      usageMap[record.metric] = {
        metric: record.metric as UsageMetric,
        count: record.count,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
      };
    });

    return usageMap as Record<UsageMetric, CurrentUsage>;
  }

  /**
   * Recalculate usage for a metric by counting actual records
   * This is useful for initial setup or data reconciliation
   */
  async recalculateUsage(metric: UsageMetric): Promise<void> {
    const organizationId = await this.getCurrentUserOrganizationId();
    const { periodStart, periodEnd } = await this.getCurrentPeriod(organizationId);
    let count = 0;

    switch (metric) {
      case 'users':
        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organizationid', organizationId)
          .eq('isActive', true);
        count = usersCount || 0;
        break;

      case 'projects':
        // Count all projects (active and archived) as they occupy resources
        const { count: projectsCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('organizationid', organizationId);
        count = projectsCount || 0;
        break;

      case 'forms':
        // Count all forms (active and archived) as they occupy resources
        const { count: formsCount } = await supabase
          .from('forms')
          .select('*', { count: 'exact', head: true })
          .eq('organizationid', organizationId);
        count = formsCount || 0;
        break;

      case 'form_responses':
        // Count all form responses (complete and incomplete) as they occupy resources
        // The majority of responses are complete when created, so tracking all is appropriate
        const { count: responsesCount } = await supabase
          .from('form_responses')
          .select('*', { count: 'exact', head: true })
          .eq('organizationid', organizationId)
          .gte('startedAt', periodStart.toISOString())
          .lte('startedAt', periodEnd.toISOString());
        count = responsesCount || 0;
        break;

      case 'reports':
        const { count: reportsCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('organizationid', organizationId);
        count = reportsCount || 0;
        break;

      case 'feedback_forms':
        const { count: feedbackFormsCount } = await supabase
          .from('feedback_forms')
          .select('*', { count: 'exact', head: true })
          .eq('organizationid', organizationId);
        count = feedbackFormsCount || 0;
        break;

      case 'feedback_submissions':
        const { count: feedbackSubmissionsCount } = await supabase
          .from('feedback_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('organizationid', organizationId);
        count = feedbackSubmissionsCount || 0;
        break;

      case 'kobo_tables':
        const { count: koboTablesCount } = await supabase
          .from('project_kobo_tables')
          .select('*', { count: 'exact', head: true })
          .eq('organizationid', organizationId);
        count = koboTablesCount || 0;
        break;

      case 'strategic_plans':
        const { count: strategicPlansCount } = await supabase
          .from('strategic_plans')
          .select('*', { count: 'exact', head: true })
          .eq('organizationid', organizationId);
        count = strategicPlansCount || 0;
        break;

      case 'storage_gb':
        // Calculate storage from media_attachments and reports
        const { data: mediaFiles } = await supabase
          .from('media_attachments')
          .select('fileSize')
          .eq('organizationid', organizationId);
        
        const { data: reportFiles } = await supabase
          .from('reports')
          .select('fileSize')
          .eq('organizationid', organizationId);

        let totalBytes = 0;
        (mediaFiles || []).forEach((file: any) => {
          totalBytes += parseInt(file.fileSize || '0', 10);
        });
        (reportFiles || []).forEach((file: any) => {
          totalBytes += parseInt(file.fileSize || '0', 10);
        });

        // Convert bytes to GB (divide by 1024^3)
        count = Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100;
        break;

      default:
        throw new Error(`Unknown metric: ${metric}`);
    }

    await this.setUsage(metric, count);
  }

  /**
   * Recalculate all usage metrics for the organization
   */
  async recalculateAllUsage(): Promise<void> {
    const metrics: UsageMetric[] = [
      'users',
      'projects',
      'forms',
      'form_responses',
      'reports',
      'feedback_forms',
      'feedback_submissions',
      'kobo_tables',
      'strategic_plans',
      'storage_gb',
    ];

    for (const metric of metrics) {
      try {
        await this.recalculateUsage(metric);
      } catch (error) {
        console.error(`Failed to recalculate ${metric}:`, error);
        // Continue with other metrics even if one fails
      }
    }
  }
}

export const supabaseUsageTrackingService = new SupabaseUsageTrackingService();

