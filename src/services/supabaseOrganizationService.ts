import { supabase } from '@/lib/supabaseClient';
import { supabaseAuthService } from './supabaseAuthService';
import { paystackService } from './paystackService';
import type { Database } from '@/types/supabase';
import type { Organization } from '@/contexts/OrganizationContext';

type OrganizationRow = Database['public']['Tables']['organizations']['Row'];
type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  domain?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string | null;
  maxUsers?: number;
  maxProjects?: number;
  isActive?: boolean;
}

export interface OrganizationStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  activeProjects: number;
  totalForms: number;
  totalReports: number;
  storageUsed: number; // in bytes
  storageLimit: number; // in bytes
}

export interface UsageStats {
  users: {
    current: number;
    limit: number;
    percentage: number;
  };
  projects: {
    current: number;
    limit: number;
    percentage: number;
  };
  storage: {
    current: number; // bytes
    limit: number; // bytes
    percentage: number;
  };
}

class SupabaseOrganizationService {
  /**
   * Get current user's organizationId
   */
  private async getCurrentUserOrganizationId(): Promise<string> {
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User is not associated with an organization');
    }
    return userProfile.organizationId;
  }

  /**
   * Get organization details
   */
  async getOrganization(organizationId?: string): Promise<Organization> {
    const orgId = organizationId || await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Organization not found');
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      domain: data.domain ?? null,
      logoUrl: data.logoUrl ?? null,
      settings: (data.settings as Record<string, any>) || {},
      subscriptionTier: data.subscriptionTier || 'free',
      subscriptionStatus: data.subscriptionStatus || 'active',
      subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
      maxUsers: data.maxUsers ?? 10,
      maxProjects: data.maxProjects ?? 5,
      isActive: data.isActive ?? true,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      createdBy: data.createdBy ?? null,
    };
  }

  /**
   * Update organization
   */
  async updateOrganization(updates: UpdateOrganizationRequest): Promise<Organization> {
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.domain !== undefined) updateData.domain = updates.domain;
    if (updates.logoUrl !== undefined) updateData.logoUrl = updates.logoUrl;
    if (updates.settings !== undefined) updateData.settings = updates.settings;
    if (updates.subscriptionTier !== undefined) updateData.subscriptionTier = updates.subscriptionTier;
    if (updates.subscriptionStatus !== undefined) updateData.subscriptionStatus = updates.subscriptionStatus;
    if (updates.subscriptionExpiresAt !== undefined) updateData.subscriptionExpiresAt = updates.subscriptionExpiresAt;
    if (updates.maxUsers !== undefined) updateData.maxUsers = updates.maxUsers;
    if (updates.maxProjects !== undefined) updateData.maxProjects = updates.maxProjects;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update organization');
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      domain: data.domain ?? null,
      logoUrl: data.logoUrl ?? null,
      settings: (data.settings as Record<string, any>) || {},
      subscriptionTier: data.subscriptionTier || 'free',
      subscriptionStatus: data.subscriptionStatus || 'active',
      subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
      maxUsers: data.maxUsers ?? 10,
      maxProjects: data.maxProjects ?? 5,
      isActive: data.isActive ?? true,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      createdBy: data.createdBy ?? null,
    };
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId?: string): Promise<OrganizationStats> {
    const orgId = organizationId || await this.getCurrentUserOrganizationId();

    // Get user counts
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organizationid', orgId); // Database column is lowercase

    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organizationid', orgId)
      .eq('isActive', true);

    // Get project counts
    const { count: totalProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organizationid', orgId);

    const { count: activeProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organizationid', orgId)
      .neq('status', 'ARCHIVED');

    // Get form counts
    const { count: totalForms } = await supabase
      .from('forms')
      .select('*', { count: 'exact', head: true })
      .eq('organizationid', orgId);

    // Get report counts
    const { count: totalReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('organizationid', orgId);

    // TODO: Calculate storage used from media attachments
    // For now, return 0
    const storageUsed = 0;
    const storageLimit = 10 * 1024 * 1024 * 1024; // 10GB default

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalProjects: totalProjects || 0,
      activeProjects: activeProjects || 0,
      totalForms: totalForms || 0,
      totalReports: totalReports || 0,
      storageUsed,
      storageLimit,
    };
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(organizationId?: string): Promise<UsageStats> {
    const orgId = organizationId || await this.getCurrentUserOrganizationId();
    const organization = await this.getOrganization(orgId);
    const stats = await this.getOrganizationStats(orgId);

    return {
      users: {
        current: stats.activeUsers,
        limit: organization.maxUsers,
        percentage: organization.maxUsers > 0 
          ? Math.round((stats.activeUsers / organization.maxUsers) * 100) 
          : 0,
      },
      projects: {
        current: stats.activeProjects,
        limit: organization.maxProjects,
        percentage: organization.maxProjects > 0 
          ? Math.round((stats.activeProjects / organization.maxProjects) * 100) 
          : 0,
      },
      storage: {
        current: stats.storageUsed,
        limit: stats.storageLimit,
        percentage: stats.storageLimit > 0 
          ? Math.round((stats.storageUsed / stats.storageLimit) * 100) 
          : 0,
      },
    };
  }

  /**
   * Initialize subscription payment
   */
  async initializeSubscriptionPayment(
    planCode: string,
    email: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<{ authorization_url: string; access_code: string; reference: string }> {
    const organizationId = await this.getCurrentUserOrganizationId();
    return await paystackService.initializeSubscription({
      organizationId,
      planCode,
      email,
      amount,
      metadata,
    });
  }

  /**
   * Get subscription details
   */
  async getSubscription(): Promise<any> {
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Get subscription from database
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organizationid', organizationId)
      .single();

    if (error || !subscription) {
      return null;
    }

    // If we have a Paystack subscription code, get details from Paystack
    const paystackCode = (subscription as any).paystacksubscriptioncode;
    if (paystackCode) {
      try {
        const paystackSubscription = await paystackService.getSubscription(paystackCode);
        return {
          ...subscription,
          paystackDetails: paystackSubscription,
        };
      } catch (error) {
        console.error('Failed to fetch Paystack subscription details:', error);
        return subscription;
      }
    }

    return subscription;
  }

  /**
   * Get subscription management link
   * The backend will automatically detect the subscription from the user's organization
   */
  async getSubscriptionManagementLink(): Promise<string | null> {
    try {
      // Backend will find the subscription code from the database
      const result = await paystackService.getSubscriptionLink();
      return result.link;
    } catch (error: any) {
      console.error('Failed to get subscription management link:', error);
      throw new Error(error.message || 'Failed to get subscription management link');
    }
  }

  /**
   * Switch subscription plan (for users with active subscriptions)
   * The backend will automatically detect the user's current subscription from the database
   */
  async switchSubscriptionPlan(planCode: string, immediate: boolean = false): Promise<void> {
    // Update subscription plan using Paystack API
    // Backend will detect the subscription from the user's organization
    // By default, immediate=false means the switch happens at the next billing cycle
    await paystackService.updateSubscription({
      planCode: planCode,
      immediate: immediate,
    });

    // Refresh organization data to get updated subscription info
    const organizationId = await this.getCurrentUserOrganizationId();
    await this.getOrganization(organizationId);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(token?: string): Promise<void> {
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organizationid', organizationId)
      .single();

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const paystackCode = (subscription as any).paystacksubscriptioncode;
    if (!paystackCode) {
      throw new Error('No Paystack subscription found');
    }

    await paystackService.cancelSubscription(paystackCode, token);
  }

  /**
   * Get billing history (invoices and payments)
   */
  async getBillingHistory(): Promise<Array<{
    id: string;
    invoiceCode: string | null;
    transactionReference: string | null;
    amount: number | null;
    paid: boolean | null;
    paidAt: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    createdAt: string | null;
  }>> {
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('subscription_usage')
      .select('id, invoicecode, transactionreference, amount, paid, paidat, periodStart, periodEnd, createdAt')
      .eq('organizationid', organizationId)
      .order('createdAt', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message || 'Failed to fetch billing history');
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      invoiceCode: item.invoicecode,
      transactionReference: item.transactionreference,
      amount: item.amount,
      paid: item.paid,
      paidAt: item.paidat,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      createdAt: item.createdAt,
    }));
  }

  /**
   * Get most recent invoice for the organization
   * Fetches from Paystack subscription API
   */
  async getMostRecentInvoice(): Promise<any | null> {
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('paystacksubscriptioncode')
      .eq('organizationid', organizationId)
      .single();

    if (error || !subscription) {
      return null;
    }

    const paystackCode = (subscription as any)?.paystacksubscriptioncode;
    if (!paystackCode) {
      return null;
    }

    try {
      const paystackSubscription = await paystackService.getSubscription(paystackCode);
      
      // Paystack subscription includes most_recent_invoice
      return (paystackSubscription as any).most_recent_invoice || null;
    } catch (error) {
      console.error('Failed to fetch most recent invoice:', error);
      return null;
    }
  }

  /**
   * Get invoice details by invoice code
   * Note: Paystack doesn't have a direct invoice API endpoint,
   * but invoice details are available through subscription API
   */
  async getInvoiceDetails(invoiceCode: string): Promise<any | null> {
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // First check our database
    const { data: invoiceRecord, error: invoiceError } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('organizationid', organizationId)
      .eq('invoicecode', invoiceCode)
      .single();

    if (invoiceError || !invoiceRecord) {
      return null;
    }

    // Try to get additional details from Paystack subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('paystacksubscriptioncode')
      .eq('organizationid', organizationId)
      .single();

    if (subError || !subscription) {
      return invoiceRecord;
    }

    const paystackCode = (subscription as any).paystacksubscriptioncode;
    if (paystackCode) {
      try {
        const paystackSubscription = await paystackService.getSubscription(paystackCode);
        
        // Check if this invoice is in the subscription's invoice history
        const invoices = (paystackSubscription as any).invoices || [];
        const invoicesHistory = (paystackSubscription as any).invoices_history || [];
        const allInvoices = [...invoices, ...invoicesHistory];
        
        const paystackInvoice = allInvoices.find(
          (inv: any) => inv.invoice_code === invoiceCode
        );

        if (paystackInvoice) {
          return {
            ...invoiceRecord,
            paystackDetails: paystackInvoice,
          };
        }
      } catch (error) {
        console.error('Failed to fetch invoice details from Paystack:', error);
      }
    }

    return invoiceRecord;
  }

  /**
   * Get failed invoices for the organization
   */
  async getFailedInvoices(): Promise<Array<{
    id: string;
    invoiceCode: string | null;
    transactionReference: string | null;
    amount: number | null;
    paid: boolean | null;
    paidAt: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    createdAt: string | null;
  }>> {
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('subscription_usage')
      .select('id, invoicecode, transactionreference, amount, paid, paidat, periodStart, periodEnd, createdAt')
      .eq('organizationid', organizationId)
      .eq('paid', false)
      .not('invoicecode', 'is', null)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch failed invoices');
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      invoiceCode: item.invoicecode,
      transactionReference: item.transactionreference,
      amount: item.amount,
      paid: item.paid,
      paidAt: item.paidat,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      createdAt: item.createdAt,
    }));
  }
}

export const supabaseOrganizationService = new SupabaseOrganizationService();

