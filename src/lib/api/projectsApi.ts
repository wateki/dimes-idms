import { Project } from '@/types/dashboard';
import { supabaseProjectsService } from '@/services/supabaseProjectsService';

export const projectsApi = {
  // Get all projects
  async getAllProjects(): Promise<Project[]> {
    return supabaseProjectsService.getAllProjects();
  },

  // Get project by ID
  async getProjectById(id: string): Promise<Project> {
    return supabaseProjectsService.getProjectById(id);
  },

  // Get projects by country
  async getProjectsByCountry(country: string): Promise<Project[]> {
    return supabaseProjectsService.getProjectsByCountry(country);
  },

  // Create new project
  async createProject(projectData: Omit<Project, 'id'>): Promise<Project> {
    return supabaseProjectsService.createProject(projectData);
  },

  // Update project
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return supabaseProjectsService.updateProject(id, updates);
  },

  // Delete project
  async deleteProject(id: string): Promise<{ success: boolean; message: string }> {
    return supabaseProjectsService.deleteProject(id);
  },

  // Archive project
  async archiveProject(id: string): Promise<Project> {
    return supabaseProjectsService.archiveProject(id);
  },

  // Restore project
  async restoreProject(id: string): Promise<Project> {
    return supabaseProjectsService.restoreProject(id);
  },
};
