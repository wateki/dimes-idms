import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import { supabaseUsageTrackingService } from './supabaseUsageTrackingService';
import { getCurrentUserOrganizationId } from './getCurrentUserOrganizationId';
import type { Project } from '@/types/dashboard';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

class SupabaseProjectsService {
  // Helper function to normalize status to database enum values
  private normalizeProjectStatus(status: string): Database['public']['Enums']['ProjectStatus'] {
    const statusMap: Record<string, Database['public']['Enums']['ProjectStatus']> = {
      'planning': 'PLANNING',
      'active': 'ACTIVE',
      'completed': 'COMPLETED',
      'on-hold': 'ON_HOLD',
      'on_hold': 'ON_HOLD',
      'archived': 'ARCHIVED',
      // Also handle uppercase values
      'PLANNING': 'PLANNING',
      'ACTIVE': 'ACTIVE',
      'COMPLETED': 'COMPLETED',
      'ON_HOLD': 'ON_HOLD',
      'ARCHIVED': 'ARCHIVED',
    };
    
    const normalized = statusMap[status.toLowerCase()] || statusMap[status] || 'PLANNING';
    return normalized as Database['public']['Enums']['ProjectStatus'];
  }

  private formatProject(project: ProjectRow): Project {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      country: project.country,
      status: project.status as Project['status'],
      startDate: new Date(project.startDate),
      endDate: new Date(project.endDate),
      progress: project.progress,
      budget: project.budget,
      spent: project.spent,
      backgroundInformation: project.backgroundInformation || undefined,
      mapData: project.mapData as any,
      theoryOfChange: project.theoryOfChange as any,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
      createdBy: project.createdBy,
      updatedBy: project.updatedBy,
    };
  }

  /**
   * Get current user's organizationId (uses shared cache helper)
   */
  private async getCurrentUserOrganizationId(): Promise<string> {
    return getCurrentUserOrganizationId();
  }

  async getAllProjects(): Promise<Project[]> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('organizationid', organizationId) // Filter by organization
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch projects');
    }

    return (data || []).map(p => this.formatProject(p));
  }

  async getProjectById(id: string): Promise<Project> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('organizationid', organizationId) // Ensure project belongs to user's organization
      .single();

    if (error || !data) {
      console.log('error fetching project by id', error);
      throw new Error(error?.message || 'Project not found');
    }

    return this.formatProject(data);
  }

  async getProjectsByCountry(country: string): Promise<Project[]> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('country', country)
      .eq('organizationid', organizationId) // Filter by organization
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch projects by country');
    }

    return (data || []).map(p => this.formatProject(p));
  }

  async createProject(projectData: Omit<Project, 'id'>): Promise<Project> {
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
      .from('projects')
      .insert({
        id: crypto.randomUUID(),
        name: projectData.name,
        description: projectData.description,
        country: projectData.country,
        status: this.normalizeProjectStatus(projectData.status),
        startDate: projectData.startDate.toISOString(),
        endDate: projectData.endDate.toISOString(),
        progress: projectData.progress || 0,
        budget: projectData.budget || 0,
        spent: projectData.spent || 0,
        backgroundInformation: projectData.backgroundInformation || null,
        mapData: projectData.mapData || null,
        theoryOfChange: projectData.theoryOfChange || null,
        organizationid: userProfile.organizationId, // Multi-tenant: Set organizationId
        createdBy: userProfile.id,
        updatedBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['projects']['Insert'])
      .select()
      .single();

    if (error || !data) {
      // Handle subscription limit errors from RLS policies
      const { handleSubscriptionError } = await import('@/utils/subscriptionErrorHandler');
      throw await handleSubscriptionError(error || { message: 'Failed to create project' }, 'projects', 'create');
    }

    // Note: Usage tracking is now handled by database trigger (track_project_insert)
    // This ensures atomicity and better performance

    return this.formatProject(data);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
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
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.status !== undefined) updateData.status = this.normalizeProjectStatus(updates.status);
    if (updates.startDate !== undefined) updateData.startDate = updates.startDate.toISOString();
    if (updates.endDate !== undefined) updateData.endDate = updates.endDate.toISOString();
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.budget !== undefined) updateData.budget = updates.budget;
    if (updates.spent !== undefined) updateData.spent = updates.spent;
    if (updates.backgroundInformation !== undefined) updateData.backgroundInformation = updates.backgroundInformation || null;
    if (updates.mapData !== undefined) updateData.mapData = updates.mapData || null;
    if (updates.theoryOfChange !== undefined) updateData.theoryOfChange = updates.theoryOfChange || null;

    // Multi-tenant: Ensure project belongs to user's organization before updating
    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .eq('organizationid', userProfile.organizationId) // Ensure project belongs to user's organization
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Project not found or access denied');
    }

    return this.formatProject(data);
  }

  async deleteProject(id: string): Promise<{ success: boolean; message: string }> {
    // Multi-tenant: Ensure project belongs to user's organization before deleting
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('organizationid', organizationId); // Ensure project belongs to user's organization

    if (error) {
      throw new Error(error.message || 'Failed to delete project or access denied');
    }

    // Note: Usage tracking is now handled by database trigger (track_project_delete)
    // This ensures atomicity and better performance

    return { success: true, message: 'Project deleted successfully' };
  }

  async archiveProject(id: string): Promise<Project> {
    return this.updateProject(id, { status: 'ARCHIVED' });
  }

  async restoreProject(id: string): Promise<Project> {
    // Get the project to determine appropriate status
    const project = await this.getProjectById(id);
    // Restore to ACTIVE if it was archived
    const newStatus = project.status === 'ARCHIVED' ? 'ACTIVE' : project.status;
    return this.updateProject(id, { status: newStatus });
  }
}

export const supabaseProjectsService = new SupabaseProjectsService();

