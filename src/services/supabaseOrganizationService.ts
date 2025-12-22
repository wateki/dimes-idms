import { supabase } from '@/lib/supabaseClient';
import { supabaseAuthService } from './supabaseAuthService';
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
      .eq('organizationId', orgId);

    const { count: activeProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organizationId', orgId)
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
}

export const supabaseOrganizationService = new SupabaseOrganizationService();

