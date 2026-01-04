import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import { getCurrentUserOrganizationId } from './getCurrentUserOrganizationId';
import { projectsCache } from './projectsCache';
import { userProfileCache } from './userProfileCache';

type ProjectFinancialDataRow = Database['public']['Tables']['project_financial_data']['Row'];
type ActivityFinancialDataRow = Database['public']['Tables']['activity_financial_data']['Row'];

export interface CreateProjectFinancialDataDto {
  projectId: string;
  year: number;
  projectName: string;
  totalBudget?: number;
}

export interface UpdateProjectFinancialDataDto {
  projectName?: string;
  totalBudget?: number;
}

export interface CreateActivityFinancialDataDto {
  activityId: string;
  activityTitle: string;
  year: number;
  q1Cost?: number;
  q2Cost?: number;
  q3Cost?: number;
  q4Cost?: number;
  totalAnnualBudget?: number;
  notes?: string;
}

export interface UpdateActivityFinancialDataDto {
  activityTitle?: string;
  q1Cost?: number;
  q2Cost?: number;
  q3Cost?: number;
  q4Cost?: number;
  totalAnnualBudget?: number;
  notes?: string;
}

export interface ProjectFinancialData {
  id: string;
  projectId: string;
  year: number;
  projectName: string;
  totalBudget: number;
  totalSpent: number;
  variance: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityFinancialData {
  id: string;
  activityId: string;
  activityTitle: string;
  year: number;
  q1Cost: number;
  q2Cost: number;
  q3Cost: number;
  q4Cost: number;
  totalAnnualBudget: number;
  totalAnnualCost: number;
  variance: number;
  notes?: string | null;
  createdAt: string;
  lastUpdated: string;
}

export interface QuarterlyFinancialData {
  budget: number;
  spent: number;
  variance: number;
}

export interface FinancialSummary {
  projectId: string;
  year: number;
  totalBudget: number;
  totalSpent: number;
  totalVariance: number;
  byQuarter: {
    q1: QuarterlyFinancialData;
    q2: QuarterlyFinancialData;
    q3: QuarterlyFinancialData;
    q4: QuarterlyFinancialData;
  };
  activityCount: number;
  lastUpdated: string;
}

class SupabaseFinancialService {
  /**
   * Get current user's organizationId (uses shared cache helper)
   */
  private async getCurrentUserOrganizationId(): Promise<string> {
    return getCurrentUserOrganizationId();
  }

  /**
   * Verify project belongs to user's organization (uses cache)
   */
  private async verifyProjectOwnership(projectId: string): Promise<void> {
    const hasAccess = await projectsCache.verifyProjectOwnership(projectId);
    if (!hasAccess) {
      throw new Error('Project not found or access denied');
    }
  }

  private formatProjectFinancialData(data: ProjectFinancialDataRow): ProjectFinancialData {
    return {
      id: data.id,
      projectId: data.projectId,
      year: data.year,
      projectName: data.projectName,
      totalBudget: data.totalBudget,
      totalSpent: data.totalSpent,
      variance: data.totalVariance, // Map totalVariance from DB to variance in interface
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private formatActivityFinancialData(data: ActivityFinancialDataRow): ActivityFinancialData {
    return {
      id: data.id,
      activityId: data.activityId,
      activityTitle: data.activityTitle,
      year: data.year,
      q1Cost: data.q1Cost,
      q2Cost: data.q2Cost,
      q3Cost: data.q3Cost,
      q4Cost: data.q4Cost,
      totalAnnualBudget: data.totalAnnualBudget,
      totalAnnualCost: data.totalAnnualCost,
      variance: data.variance,
      notes: data.notes ?? undefined,
      createdAt: data.createdAt,
      lastUpdated: data.lastUpdated,
    };
  }

  // Project Financial Data
  async createProjectFinancialData(data: CreateProjectFinancialDataDto): Promise<ProjectFinancialData> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(data.projectId);
    
    // Use cached user profile
    const cachedProfile = await userProfileCache.getCachedProfile();
    if (!cachedProfile) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    const organizationId = await this.getCurrentUserOrganizationId();

    const now = new Date().toISOString();
    const { data: financialData, error } = await supabase
      .from('project_financial_data')
      .insert({
        id: crypto.randomUUID(),
        projectId: data.projectId,
        year: data.year,
        projectName: data.projectName,
        totalBudget: data.totalBudget || 0,
        totalSpent: 0,
        totalVariance: data.totalBudget || 0,
        organizationid: organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
        createdBy: cachedProfile.user.id,
        createdAt: now,
        updatedAt: now,
        lastUpdated: now,
      } as Database['public']['Tables']['project_financial_data']['Insert'])
      .select()
      .single();

    if (error || !financialData) {
      throw new Error(error?.message || 'Failed to create project financial data');
    }

    return this.formatProjectFinancialData(financialData as any);
  }

  async getProjectFinancialData(projectId: string, year?: number): Promise<ProjectFinancialData[]> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    let query = supabase
      .from('project_financial_data')
      .select('*')
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Filter by organization

    if (year) {
      query = query.eq('year', year);
    }

    const { data, error } = await query.order('year', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch project financial data');
    }

    return (data || []).map(d => this.formatProjectFinancialData(d as any));
  }

  async getProjectFinancialDataById(id: string): Promise<ProjectFinancialData> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('project_financial_data')
      .select('*')
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Project financial data not found or access denied');
    }

    return this.formatProjectFinancialData(data as any);
  }

  async updateProjectFinancialData(id: string, data: UpdateProjectFinancialDataDto): Promise<ProjectFinancialData> {
    // Multi-tenant: Verify ownership (getProjectFinancialDataById already checks organizationId)
    const existing = await this.getProjectFinancialDataById(id);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const updateData: any = {
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    if (data.projectName !== undefined) updateData.projectName = data.projectName;
    if (data.totalBudget !== undefined) {
      updateData.totalBudget = data.totalBudget;
      // Recalculate variance
      updateData.totalVariance = data.totalBudget - existing.totalSpent;
    }

    // Multi-tenant: Ensure ownership
    const { data: updated, error } = await supabase
      .from('project_financial_data')
      .update(updateData)
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update project financial data or access denied');
    }

    return this.formatProjectFinancialData(updated as any);
  }

  async deleteProjectFinancialData(id: string): Promise<{ message: string }> {
    // Multi-tenant: Verify ownership first
    await this.getProjectFinancialDataById(id); // This already checks organizationId
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { error } = await supabase
      .from('project_financial_data')
      .delete()
      .eq('id', id)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) {
      throw new Error(error.message || 'Failed to delete project financial data or access denied');
    }

    return { message: 'Project financial data deleted successfully' };
  }

  // Activity Financial Data
  async createActivityFinancialData(data: CreateActivityFinancialDataDto): Promise<ActivityFinancialData> {
    // Use cached user profile
    const cachedProfile = await userProfileCache.getCachedProfile();
    if (!cachedProfile) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    // Multi-tenant: Verify activity belongs to user's organization
    const organizationId = await this.getCurrentUserOrganizationId();
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('projectId, organizationid')
      .eq('id', data.activityId)
      .eq('organizationid', organizationId) // Verify ownership (lowercase column)
      .single();

    if (activityError || !activity) {
      throw new Error('Activity not found or access denied');
    }
    
    // Verify project ownership
    await this.verifyProjectOwnership(activity.projectId);

    // Find or create project financial data (filtered by organization)
    let { data: projectFinancial } = await supabase
      .from('project_financial_data')
      .select('*')
      .eq('projectId', activity.projectId)
      .eq('year', data.year)
      .eq('organizationid', organizationId) // Filter by organization
      .single();

    if (!projectFinancial) {
      // Get project name
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', activity.projectId)
        .eq('organizationid', organizationId) // Verify ownership
        .single();

      if (!project) {
        throw new Error('Project not found or access denied');
      }

      const now = new Date().toISOString();
      const { data: created } = await supabase
        .from('project_financial_data')
        .insert({
          id: crypto.randomUUID(),
          projectId: activity.projectId,
          year: data.year,
          projectName: project.name || 'Unknown Project',
          totalBudget: 0,
          totalSpent: 0,
          totalVariance: 0,
          organizationid: organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
          createdBy: cachedProfile.user.id,
          createdAt: now,
          updatedAt: now,
          lastUpdated: now,
        })
        .select()
        .single();

      projectFinancial = created;
    }

    // Calculate totals
    const totalAnnualCost = (data.q1Cost || 0) + (data.q2Cost || 0) + (data.q3Cost || 0) + (data.q4Cost || 0);
    const variance = (data.totalAnnualBudget || 0) - totalAnnualCost;

    const now = new Date().toISOString();
    const { data: activityFinancial, error } = await supabase
      .from('activity_financial_data')
      .insert({
        id: crypto.randomUUID(),
        projectFinancialId: projectFinancial!.id,
        activityId: data.activityId,
        activityTitle: data.activityTitle,
        year: data.year,
        q1Cost: data.q1Cost || 0,
        q2Cost: data.q2Cost || 0,
        q3Cost: data.q3Cost || 0,
        q4Cost: data.q4Cost || 0,
        totalAnnualBudget: data.totalAnnualBudget || 0,
        totalAnnualCost,
        variance,
        notes: data.notes || null,
        organizationid: organizationId, // Multi-tenant: Set organizationid (database column is lowercase)
        createdBy: cachedProfile.user.id,
        createdAt: now,
        updatedAt: now,
        lastUpdated: now,
      } as unknown as Database['public']['Tables']['activity_financial_data']['Insert'])
      .select()
      .single();

    if (error || !activityFinancial) {
      throw new Error(error?.message || 'Failed to create activity financial data');
    }

    // Update project financial totals (filtered by organization)
    const { data: allActivities } = await supabase
      .from('activity_financial_data')
      .select('totalAnnualCost, totalAnnualBudget')
      .eq('projectFinancialId', projectFinancial!.id)
      .eq('organizationid', organizationId); // Filter by organization

    const totalSpent = (allActivities || []).reduce((sum, a) => sum + (a.totalAnnualCost || 0), 0);
    const totalBudget = (allActivities || []).reduce((sum, a) => sum + (a.totalAnnualBudget || 0), 0);

    await supabase
      .from('project_financial_data')
      .update({
        totalSpent,
        totalBudget,
        totalVariance: totalBudget - totalSpent,
        lastUpdated: now,
        updatedAt: now,
      })
      .eq('id', projectFinancial!.id)
      .eq('organizationid', organizationId); // Ensure ownership

    return this.formatActivityFinancialData(activityFinancial as any);
  }

  async getActivityFinancialData(activityId: string, year?: number): Promise<ActivityFinancialData[]> {
    // Multi-tenant: Verify activity belongs to user's organization
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // First verify activity ownership
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, organizationid')
      .eq('id', activityId)
      .eq('organizationid', organizationId) // Verify ownership (lowercase)
      .single();

    if (activityError || !activity) {
      throw new Error('Activity not found or access denied');
    }
    
    let query = supabase
      .from('activity_financial_data')
      .select('*')
      .eq('activityId', activityId)
      .eq('organizationid', organizationId); // Filter by organization

    if (year) {
      query = query.eq('year', year);
    }

    const { data, error } = await query.order('year', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch activity financial data');
    }

    return (data || []).map(d => this.formatActivityFinancialData(d as any));
  }

  async updateActivityFinancialData(id: string, data: UpdateActivityFinancialDataDto): Promise<ActivityFinancialData> {
    // Multi-tenant: Verify ownership
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Get existing data to calculate new totals
    const { data: existing, error: existingError } = await supabase
      .from('activity_financial_data')
      .select('*')
      .eq('id', id)
        .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (existingError || !existing) {
      throw new Error('Activity financial data not found or access denied');
    }

    const q1Cost = data.q1Cost !== undefined ? data.q1Cost : existing.q1Cost;
    const q2Cost = data.q2Cost !== undefined ? data.q2Cost : existing.q2Cost;
    const q3Cost = data.q3Cost !== undefined ? data.q3Cost : existing.q3Cost;
    const q4Cost = data.q4Cost !== undefined ? data.q4Cost : existing.q4Cost;
    const totalAnnualBudget = data.totalAnnualBudget !== undefined ? data.totalAnnualBudget : existing.totalAnnualBudget;

    const totalAnnualCost = q1Cost + q2Cost + q3Cost + q4Cost;
    const variance = totalAnnualBudget - totalAnnualCost;

    const now = new Date().toISOString();
    const updateData: any = {
      q1Cost,
      q2Cost,
      q3Cost,
      q4Cost,
      totalAnnualBudget,
      totalAnnualCost,
      variance,
      lastUpdated: now,
      updatedAt: now,
    };

    if (data.activityTitle !== undefined) updateData.activityTitle = data.activityTitle;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    // Multi-tenant: Ensure ownership
    const { data: updated, error } = await supabase
      .from('activity_financial_data')
      .update(updateData)
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update activity financial data or access denied');
    }

    // Update project financial totals (filtered by organization)
    const { data: projectFinancial } = await supabase
      .from('activity_financial_data')
      .select('projectFinancialId')
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (projectFinancial) {
      const { data: allActivities } = await supabase
        .from('activity_financial_data')
        .select('totalAnnualCost, totalAnnualBudget')
        .eq('projectFinancialId', projectFinancial.projectFinancialId)
        .eq('organizationid', organizationId); // Filter by organization

      const totalSpent = (allActivities || []).reduce((sum, a) => sum + (a.totalAnnualCost || 0), 0);
      const totalBudget = (allActivities || []).reduce((sum, a) => sum + (a.totalAnnualBudget || 0), 0);

      await supabase
        .from('project_financial_data')
        .update({
          totalSpent,
          totalBudget,
          totalVariance: totalBudget - totalSpent,
          lastUpdated: now,
          updatedAt: now,
        })
        .eq('id', projectFinancial.projectFinancialId)
        .eq('organizationid', organizationId); // Ensure ownership
    }

    return this.formatActivityFinancialData(updated as any);
  }

  async deleteActivityFinancialData(id: string): Promise<{ message: string }> {
    // Multi-tenant: Verify ownership
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Get project financial ID before deleting
    const { data: existing, error: existingError } = await supabase
      .from('activity_financial_data')
      .select('projectFinancialId')
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (existingError || !existing) {
      throw new Error('Activity financial data not found or access denied');
    }

    const { error } = await supabase
      .from('activity_financial_data')
      .delete()
      .eq('id', id)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) {
      throw new Error(error.message || 'Failed to delete activity financial data or access denied');
    }

    // Update project financial totals (filtered by organization)
    if (existing) {
      const { data: allActivities } = await supabase
        .from('activity_financial_data')
        .select('totalAnnualCost, totalAnnualBudget')
        .eq('projectFinancialId', existing.projectFinancialId)
        .eq('organizationid', organizationId); // Filter by organization

      const totalSpent = (allActivities || []).reduce((sum, a) => sum + (a.totalAnnualCost || 0), 0);
      const totalBudget = (allActivities || []).reduce((sum, a) => sum + (a.totalAnnualBudget || 0), 0);
      const now = new Date().toISOString();

      await supabase
        .from('project_financial_data')
        .update({
          totalSpent,
          totalBudget,
          totalVariance: totalBudget - totalSpent,
          lastUpdated: now,
          updatedAt: now,
        })
        .eq('id', existing.projectFinancialId)
        .eq('organizationid', organizationId); // Ensure ownership
    }

    return { message: 'Activity financial data deleted successfully' };
  }

  // Financial Summary
  async getFinancialSummary(projectId: string, year: number): Promise<FinancialSummary> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data: projectFinancial, error: projectFinancialError } = await supabase
      .from('project_financial_data')
      .select('*')
      .eq('projectId', projectId)
      .eq('year', year)
      .eq('organizationid', organizationId) // Filter by organization
      .single();

    if (projectFinancialError || !projectFinancial) {
      throw new Error('Project financial data not found for this year');
    }

    const { data: activities } = await supabase
      .from('activity_financial_data')
      .select('q1Cost, q2Cost, q3Cost, q4Cost, totalAnnualBudget')
      .eq('projectFinancialId', projectFinancial.id)
      .eq('organizationid', organizationId); // Filter by organization

    const q1Spent = (activities || []).reduce((sum, a) => sum + (a.q1Cost || 0), 0);
    const q2Spent = (activities || []).reduce((sum, a) => sum + (a.q2Cost || 0), 0);
    const q3Spent = (activities || []).reduce((sum, a) => sum + (a.q3Cost || 0), 0);
    const q4Spent = (activities || []).reduce((sum, a) => sum + (a.q4Cost || 0), 0);

    const q1Budget = (activities || []).reduce((sum, a) => sum + ((a.totalAnnualBudget || 0) / 4), 0);
    const q2Budget = q1Budget;
    const q3Budget = q1Budget;
    const q4Budget = q1Budget;

    return {
      projectId,
      year,
      totalBudget: projectFinancial.totalBudget,
      totalSpent: projectFinancial.totalSpent,
      totalVariance: projectFinancial.totalVariance,
      byQuarter: {
        q1: {
          budget: q1Budget,
          spent: q1Spent,
          variance: q1Budget - q1Spent,
        },
        q2: {
          budget: q2Budget,
          spent: q2Spent,
          variance: q2Budget - q2Spent,
        },
        q3: {
          budget: q3Budget,
          spent: q3Spent,
          variance: q3Budget - q3Spent,
        },
        q4: {
          budget: q4Budget,
          spent: q4Spent,
          variance: q4Budget - q4Spent,
        },
      },
      activityCount: activities?.length || 0,
      lastUpdated: projectFinancial.lastUpdated,
    };
  }

  async getProjectFinancialYears(projectId: string): Promise<{ years: number[] }> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('project_financial_data')
      .select('year')
      .eq('projectId', projectId)
        .eq('organizationid', organizationId) // Filter by organization
      .order('year', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch project financial years');
    }

    const years = (data || []).map(d => d.year);
    return { years: [...new Set(years)] };
  }

  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

export const supabaseFinancialService = new SupabaseFinancialService();

