import { supabaseFinancialService } from '@/services/supabaseFinancialService';
import type {
  CreateProjectFinancialDataDto,
  UpdateProjectFinancialDataDto,
  CreateActivityFinancialDataDto,
  UpdateActivityFinancialDataDto,
  ProjectFinancialData,
  ActivityFinancialData,
  QuarterlyFinancialData,
  FinancialSummary,
} from '@/services/supabaseFinancialService';

// Re-export types for backwards compatibility
export type {
  CreateProjectFinancialDataDto,
  UpdateProjectFinancialDataDto,
  CreateActivityFinancialDataDto,
  UpdateActivityFinancialDataDto,
  ProjectFinancialData,
  ActivityFinancialData,
  QuarterlyFinancialData,
  FinancialSummary,
};

// Project Financial Data API
export const financialApi = {
  // Project Financial Data
  async createProjectFinancialData(data: CreateProjectFinancialDataDto): Promise<ProjectFinancialData> {
    return supabaseFinancialService.createProjectFinancialData(data);
  },

  async getProjectFinancialData(projectId: string, year?: number): Promise<ProjectFinancialData[]> {
    return supabaseFinancialService.getProjectFinancialData(projectId, year);
  },

  async getProjectFinancialDataById(id: string): Promise<ProjectFinancialData> {
    return supabaseFinancialService.getProjectFinancialDataById(id);
  },

  async updateProjectFinancialData(id: string, data: UpdateProjectFinancialDataDto): Promise<ProjectFinancialData> {
    return supabaseFinancialService.updateProjectFinancialData(id, data);
  },

  async deleteProjectFinancialData(id: string): Promise<{ message: string }> {
    return supabaseFinancialService.deleteProjectFinancialData(id);
  },

  // Activity Financial Data
  async createActivityFinancialData(data: CreateActivityFinancialDataDto): Promise<ActivityFinancialData> {
    return supabaseFinancialService.createActivityFinancialData(data);
  },

  async getActivityFinancialData(activityId: string, year?: number): Promise<ActivityFinancialData[]> {
    return supabaseFinancialService.getActivityFinancialData(activityId, year);
  },

  async updateActivityFinancialData(id: string, data: UpdateActivityFinancialDataDto): Promise<ActivityFinancialData> {
    return supabaseFinancialService.updateActivityFinancialData(id, data);
  },

  async deleteActivityFinancialData(id: string): Promise<{ message: string }> {
    return supabaseFinancialService.deleteActivityFinancialData(id);
  },

  // Financial Summary and Analytics
  async getFinancialSummary(projectId: string, year: number): Promise<FinancialSummary> {
    return supabaseFinancialService.getFinancialSummary(projectId, year);
  },

  async getProjectFinancialYears(projectId: string): Promise<{ years: number[] }> {
    return supabaseFinancialService.getProjectFinancialYears(projectId);
  },

  // Health check
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return supabaseFinancialService.getHealth();
  },
};
