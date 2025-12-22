import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import type { Outcome, Activity } from '@/types/dashboard';

type OutcomeRow = Database['public']['Tables']['outcomes']['Row'];
type ActivityRow = Database['public']['Tables']['activities']['Row'];
type KpiRow = Database['public']['Tables']['kpis']['Row'];

export interface CreateOutcomeDto {
  title: string;
  description?: string;
  target?: number;
  current?: number;
  unit?: string;
  status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND';
  progress?: number;
}

export interface CreateActivityDto {
  outcomeId: string;
  title: string;
  description?: string;
  responsible?: string;
  status?: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'NOT_STARTED' | 'IN_PROGRESS';
  startDate?: string;
  endDate?: string;
  progress?: number;
  budget?: number;
  spent?: number;
}

export interface CreateKPIDto {
  outcomeId?: string;
  name: string;
  title?: string;
  description?: string;
  target?: number;
  current?: number;
  unit?: string;
  type?: string;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
}

class SupabaseProjectDataService {
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
   * Verify project belongs to user's organization
   */
  private async verifyProjectOwnership(projectId: string): Promise<void> {
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('projects')
      .select('id, organizationid')
      .eq('id', projectId)
      .eq('organizationid', organizationId)
      .single();

    if (error || !data) {
      throw new Error('Project not found or access denied');
    }
  }

  private formatOutcome(outcome: OutcomeRow): Outcome {
    return {
      id: outcome.id,
      projectId: outcome.projectId,
      title: outcome.title,
      description: outcome.description || '',
      target: outcome.target || 0,
      current: outcome.current || 0,
      unit: outcome.unit || '',
      status: outcome.status as Outcome['status'],
      progress: outcome.progress,
    };
  }

  private formatActivity(activity: ActivityRow): Activity {
    return {
      id: activity.id,
      outcomeId: activity.outcomeId,
      title: activity.title,
      description: activity.description || '',
      responsible: activity.responsible || '',
      status: (activity.status || 'PLANNING') as Activity['status'],
      startDate: activity.startDate ? new Date(activity.startDate) : new Date(),
      endDate: activity.endDate ? new Date(activity.endDate) : new Date(),
      progress: activity.progress,
    };
  }

  // Outcomes
  async getProjectOutcomes(projectId: string): Promise<Outcome[]> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('outcomes')
      .select('*')
      .eq('projectId', projectId)
      .eq('organizationid', organizationId) // Filter by organization
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch project outcomes');
    }

    return (data || []).map(o => this.formatOutcome(o));
  }

  async createProjectOutcome(projectId: string, outcomeData: CreateOutcomeDto): Promise<Outcome> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('outcomes')
      .insert({
        id: crypto.randomUUID(),
        projectId,
        title: outcomeData.title,
        description: outcomeData.description || null,
        target: outcomeData.target || null,
        current: outcomeData.current || null,
        unit: outcomeData.unit || null,
        status: (outcomeData.status || 'PLANNING') as Database['public']['Enums']['OutcomeStatus'],
        progress: outcomeData.progress || 0,
        organizationId: userProfile.organizationId, // Multi-tenant: Set organizationId
        createdBy: userProfile.id,
        updatedBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['outcomes']['Insert'])
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create project outcome');
    }

    return this.formatOutcome(data);
  }

  async updateProjectOutcome(projectId: string, outcomeId: string, updates: Partial<Outcome>): Promise<Outcome> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    const updateData: any = {
      updatedBy: userProfile.id,
      updatedAt: new Date().toISOString(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.target !== undefined) updateData.target = updates.target || null;
    if (updates.current !== undefined) updateData.current = updates.current || null;
    if (updates.unit !== undefined) updateData.unit = updates.unit || null;
    if (updates.status !== undefined) updateData.status = updates.status as Database['public']['Enums']['OutcomeStatus'];
    if (updates.progress !== undefined) updateData.progress = updates.progress;

    // Multi-tenant: Verify outcome belongs to user's organization
    const { data, error } = await supabase
      .from('outcomes')
      .update(updateData)
      .eq('id', outcomeId)
      .eq('projectId', projectId)
      .eq('organizationid', userProfile.organizationId) // Ensure ownership
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update project outcome or access denied');
    }

    return this.formatOutcome(data);
  }

  async deleteProjectOutcome(projectId: string, outcomeId: string): Promise<{ success: boolean; message: string }> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { error } = await supabase
      .from('outcomes')
      .delete()
      .eq('id', outcomeId)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) {
      throw new Error(error.message || 'Failed to delete project outcome or access denied');
    }

    return { success: true, message: 'Outcome deleted successfully' };
  }

  // Activities
  async getProjectActivities(projectId: string): Promise<Activity[]> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Note: activities table uses lowercase 'organizationid' column
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('projectId', projectId)
      .eq('organizationid', organizationId) // Filter by organization (lowercase column name)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch project activities');
    }

    return (data || []).map(a => this.formatActivity(a));
  }

  async createProjectActivity(projectId: string, activityData: CreateActivityDto): Promise<Activity> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    const now = new Date().toISOString();
    // Note: activities table uses lowercase 'organizationid' column
    const { data, error } = await supabase
      .from('activities')
      .insert({
        id: crypto.randomUUID(),
        projectId,
        outcomeId: activityData.outcomeId,
        title: activityData.title,
        description: activityData.description || null,
        responsible: activityData.responsible || null,
        status: (activityData.status || 'PLANNING') as Database['public']['Enums']['ActivityStatus'],
        startDate: activityData.startDate || null,
        endDate: activityData.endDate || null,
        progress: activityData.progress || 0,
        budget: activityData.budget || 0,
        spent: activityData.spent || 0,
        organizationid: userProfile.organizationId, // Multi-tenant: Set organizationId (lowercase)
        createdBy: userProfile.id,
        updatedBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['activities']['Insert'])
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create project activity');
    }

    return this.formatActivity(data);
  }

  async updateProjectActivity(projectId: string, activityId: string, updates: Partial<Activity> & { budget?: number; spent?: number }): Promise<Activity> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    const updateData: any = {
      updatedBy: userProfile.id,
      updatedAt: new Date().toISOString(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.responsible !== undefined) updateData.responsible = updates.responsible || null;
    if (updates.status !== undefined) updateData.status = updates.status as Database['public']['Enums']['ActivityStatus'];
    if (updates.startDate !== undefined) updateData.startDate = updates.startDate?.toISOString() || null;
    if (updates.endDate !== undefined) updateData.endDate = updates.endDate?.toISOString() || null;
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if ((updates as any).budget !== undefined) updateData.budget = (updates as any).budget;
    if ((updates as any).spent !== undefined) updateData.spent = (updates as any).spent;

    // Multi-tenant: Verify activity belongs to user's organization (note: lowercase column name)
    const { data, error } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', activityId)
      .eq('projectId', projectId)
      .eq('organizationid', userProfile.organizationId) // Ensure ownership (lowercase)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update project activity or access denied');
    }

    return this.formatActivity(data);
  }

  async deleteProjectActivity(projectId: string, activityId: string): Promise<{ success: boolean; message: string }> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Note: activities table uses lowercase 'organizationid' column
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Ensure ownership (lowercase)

    if (error) {
      throw new Error(error.message || 'Failed to delete project activity or access denied');
    }

    return { success: true, message: 'Activity deleted successfully' };
  }

  // Outputs (if they exist as a separate table)
  async getProjectOutputs(projectId: string): Promise<any[]> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('outputs')
      .select('*')
      .eq('projectId', projectId)
      .eq('organizationid', organizationId) // Filter by organization
      .order('createdAt', { ascending: false });

    if (error) {
      // If outputs table doesn't exist, return empty array
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return [];
      }
      throw new Error(error.message || 'Failed to fetch project outputs');
    }

    return data || [];
  }

  // Sub-activities
  async getProjectSubActivities(projectId: string): Promise<any[]> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Get sub-activities through activities (filtered by organization)
    const { data: activities } = await supabase
      .from('activities')
      .select('id')
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Filter by organization (lowercase)

    if (!activities || activities.length === 0) {
      return [];
    }

    const activityIds = activities.map(a => a.id);
    const { data, error } = await supabase
      .from('sub_activities')
      .select('*')
      .in('activityId', activityIds)
      .eq('organizationid', organizationId) // Filter by organization
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch project sub-activities');
    }

    return data || [];
  }

  // KPIs
  async getProjectKPIs(projectId: string): Promise<any[]> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('projectId', projectId)
      .eq('organizationid', organizationId) // Filter by organization
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch project KPIs');
    }

    return (data || []).map(kpi => ({
      id: kpi.id,
      projectId: kpi.projectId,
      outcomeId: kpi.outcomeId || undefined,
      name: kpi.name,
      title: kpi.title || undefined,
      description: kpi.description || undefined,
      target: kpi.target || undefined,
      current: kpi.current,
      unit: kpi.unit || undefined,
      type: kpi.type || undefined,
      frequency: kpi.frequency,
      createdAt: new Date(kpi.createdAt),
      updatedAt: new Date(kpi.updatedAt),
      createdBy: kpi.createdBy,
      updatedBy: kpi.updatedBy,
    }));
  }

  async createProjectKPI(projectId: string, kpiData: CreateKPIDto): Promise<any> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('kpis')
      .insert({
        id: crypto.randomUUID(),
        projectId,
        outcomeId: kpiData.outcomeId || null,
        name: kpiData.name,
        title: kpiData.title || null,
        description: kpiData.description || null,
        target: kpiData.target || null,
        current: kpiData.current || 0,
        unit: kpiData.unit || null,
        type: kpiData.type || null,
        frequency: (kpiData.frequency || 'MONTHLY') as Database['public']['Enums']['KPIFrequency'],
        organizationId: userProfile.organizationId, // Multi-tenant: Set organizationId
        createdBy: userProfile.id,
        updatedBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['kpis']['Insert'])
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create project KPI');
    }

    return {
      id: data.id,
      projectId: data.projectId,
      outcomeId: data.outcomeId || undefined,
      name: data.name,
      title: data.title || undefined,
      description: data.description || undefined,
      target: data.target || undefined,
      current: data.current,
      unit: data.unit || undefined,
      type: data.type || undefined,
      frequency: data.frequency,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    };
  }

  async updateProjectKPI(projectId: string, kpiId: string, updates: any): Promise<any> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    const updateData: any = {
      updatedBy: userProfile.id,
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.title !== undefined) updateData.title = updates.title || null;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.target !== undefined) updateData.target = updates.target || null;
    if (updates.current !== undefined) updateData.current = updates.current;
    if (updates.unit !== undefined) updateData.unit = updates.unit || null;
    if (updates.type !== undefined) updateData.type = updates.type || null;
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency as Database['public']['Enums']['KPIFrequency'];
    if (updates.outcomeId !== undefined) updateData.outcomeId = updates.outcomeId || null;

    // Multi-tenant: Verify KPI belongs to user's organization
    const { data, error } = await supabase
      .from('kpis')
      .update(updateData)
      .eq('id', kpiId)
      .eq('projectId', projectId)
      .eq('organizationid', userProfile.organizationId) // Ensure ownership
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update project KPI or access denied');
    }

    return {
      id: data.id,
      projectId: data.projectId,
      outcomeId: data.outcomeId || undefined,
      name: data.name,
      title: data.title || undefined,
      description: data.description || undefined,
      target: data.target || undefined,
      current: data.current,
      unit: data.unit || undefined,
      type: data.type || undefined,
      frequency: data.frequency,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    };
  }

  async deleteProjectKPI(projectId: string, kpiId: string): Promise<{ success: boolean; message: string }> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { error } = await supabase
      .from('kpis')
      .delete()
      .eq('id', kpiId)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) {
      throw new Error(error.message || 'Failed to delete project KPI or access denied');
    }

    return { success: true, message: 'KPI deleted successfully' };
  }

  // Reports (delegated to reportService)
  async getProjectReports(projectId: string): Promise<any[]> {
    // This should use reportService, but for now return empty array
    // Reports are handled by reportService
    return [];
  }
}

export const supabaseProjectDataService = new SupabaseProjectDataService();

