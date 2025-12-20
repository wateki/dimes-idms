import { Outcome, Activity, Report } from '@/types/dashboard';
import { supabaseProjectDataService } from '@/services/supabaseProjectDataService';
import type {
  CreateOutcomeDto,
  CreateActivityDto,
  CreateKPIDto,
} from '@/services/supabaseProjectDataService';

// Re-export types for backwards compatibility
export type { CreateOutcomeDto, CreateActivityDto, CreateKPIDto };

export const projectDataApi = {
  // Get project outcomes
  async getProjectOutcomes(projectId: string): Promise<Outcome[]> {
    return supabaseProjectDataService.getProjectOutcomes(projectId);
  },

  // Get project activities
  async getProjectActivities(projectId: string): Promise<Activity[]> {
    return supabaseProjectDataService.getProjectActivities(projectId);
  },

  // Get project outputs
  async getProjectOutputs(projectId: string): Promise<any[]> {
    return supabaseProjectDataService.getProjectOutputs(projectId);
  },

  // Get project sub-activities
  async getProjectSubActivities(projectId: string): Promise<any[]> {
    return supabaseProjectDataService.getProjectSubActivities(projectId);
  },

  // Get project KPIs
  async getProjectKPIs(projectId: string): Promise<any[]> {
    return supabaseProjectDataService.getProjectKPIs(projectId);
  },

  // Get project reports
  async getProjectReports(projectId: string): Promise<Report[]> {
    return supabaseProjectDataService.getProjectReports(projectId);
  },

  // Create project outcome
  async createProjectOutcome(projectId: string, outcomeData: CreateOutcomeDto): Promise<Outcome> {
    return supabaseProjectDataService.createProjectOutcome(projectId, outcomeData);
  },

  // Create project activity
  async createProjectActivity(projectId: string, activityData: CreateActivityDto): Promise<Activity> {
    return supabaseProjectDataService.createProjectActivity(projectId, activityData);
  },

  // Update project outcome
  async updateProjectOutcome(projectId: string, outcomeId: string, updates: Partial<Outcome>): Promise<Outcome> {
    return supabaseProjectDataService.updateProjectOutcome(projectId, outcomeId, updates);
  },

  // Update project activity
  async updateProjectActivity(projectId: string, activityId: string, updates: Partial<Activity>): Promise<Activity> {
    return supabaseProjectDataService.updateProjectActivity(projectId, activityId, updates);
  },

  // Delete project outcome
  async deleteProjectOutcome(projectId: string, outcomeId: string): Promise<{ success: boolean; message: string }> {
    return supabaseProjectDataService.deleteProjectOutcome(projectId, outcomeId);
  },

  // Delete project activity
  async deleteProjectActivity(projectId: string, activityId: string): Promise<{ success: boolean; message: string }> {
    return supabaseProjectDataService.deleteProjectActivity(projectId, activityId);
  },

  // Create project KPI
  async createProjectKPI(projectId: string, kpiData: CreateKPIDto): Promise<any> {
    return supabaseProjectDataService.createProjectKPI(projectId, kpiData);
  },

  // Update project KPI
  async updateProjectKPI(projectId: string, kpiId: string, updates: any): Promise<any> {
    return supabaseProjectDataService.updateProjectKPI(projectId, kpiId, updates);
  },

  // Delete project KPI
  async deleteProjectKPI(projectId: string, kpiId: string): Promise<{ success: boolean; message: string }> {
    return supabaseProjectDataService.deleteProjectKPI(projectId, kpiId);
  },
};
