import type { Project } from '@/types/dashboard';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { userProfileCache } from './userProfileCache';
import { getCurrentUserOrganizationId } from './getCurrentUserOrganizationId';

interface CachedProjects {
  projects: Project[];
  organizationId: string;
  cachedAt: number;
}

const CACHE_KEY = 'ics_projects_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

class ProjectsCacheService {
  private refreshPromise: Promise<CachedProjects | null> | null = null;

  /**
   * Get cached projects from localStorage
   * Returns cached value if available and fresh, otherwise fetches and caches
   */
  async getCachedProjects(): Promise<Project[]> {
    // Try to load from localStorage first
    const cached = this.loadFromStorage();
    
    // Check if cache is valid and for current organization
    if (cached && this.isCacheValid(cached)) {
      const isForCurrentOrg = await this.isCacheForCurrentOrganization(cached.organizationId);
      if (isForCurrentOrg) {
        return cached.projects;
      } else {
        // Cache is for different organization, clear it
        this.clearCache();
      }
    }

    // If already refreshing, wait for that promise
    if (this.refreshPromise) {
      const result = await this.refreshPromise;
      return result?.projects || [];
    }

    // Fetch and cache
    this.refreshPromise = this.fetchAndCache();
    const result = await this.refreshPromise;
    this.refreshPromise = null;

    return result?.projects || [];
  }

  /**
   * Get a single project by ID from cache
   */
  async getProjectById(projectId: string): Promise<Project | null> {
    const projects = await this.getCachedProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  /**
   * Verify project ownership using cache (no database query needed)
   */
  async verifyProjectOwnership(projectId: string): Promise<boolean> {
    const project = await this.getProjectById(projectId);
    if (!project) {
      return false;
    }

    // Verify it belongs to current organization
    const organizationId = await userProfileCache.getCachedOrganizationId();
    // Since projects are filtered by organizationId when cached, if found, it's owned
    return organizationId !== null;
  }

  /**
   * Update cache after create/update/delete/archive operations
   */
  async updateCache(updatedProject?: Project, deletedProjectId?: string): Promise<void> {
    const cached = this.loadFromStorage();
    if (!cached || !this.isCacheValid(cached)) {
      // Cache is stale, refresh it
      await this.refreshCache();
      return;
    }

    const organizationId = await userProfileCache.getCachedOrganizationId();
    if (!organizationId || cached.organizationId !== organizationId) {
      // Different organization, refresh
      await this.refreshCache();
      return;
    }

    let projects = [...cached.projects];

    if (deletedProjectId) {
      // Remove deleted project
      projects = projects.filter(p => p.id !== deletedProjectId);
    } else if (updatedProject) {
      // Update or add project
      const index = projects.findIndex(p => p.id === updatedProject.id);
      if (index >= 0) {
        projects[index] = updatedProject;
      } else {
        projects.push(updatedProject);
      }
    }

    // Save updated cache
    const updatedCache: CachedProjects = {
      projects,
      organizationId,
      cachedAt: Date.now(),
    };
    this.saveToStorage(updatedCache);
  }

  /**
   * Set cache explicitly
   */
  setCache(projects: Project[], organizationId: string): void {
    const cached: CachedProjects = {
      projects,
      organizationId,
      cachedAt: Date.now(),
    };
    this.saveToStorage(cached);
  }

  /**
   * Clear cache (called on logout or organization change)
   */
  clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('[ProjectsCache] Error clearing cache from localStorage:', error);
    }
    this.refreshPromise = null;
  }

  /**
   * Force refresh cache (bypasses cache validity check)
   */
  async refreshCache(): Promise<Project[]> {
    this.clearCache();
    this.refreshPromise = null;
    const projects = await this.getCachedProjects();
    return projects;
  }

  /**
   * Check if cache is valid (not expired)
   */
  private isCacheValid(cached: CachedProjects): boolean {
    const age = Date.now() - cached.cachedAt;
    return age < CACHE_DURATION;
  }

  /**
   * Format project from database row
   */
  private formatProject(project: Database['public']['Tables']['projects']['Row']): Project {
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
   * Fetch projects from database and cache them
   */
  private async fetchAndCache(): Promise<CachedProjects | null> {
    try {
      const organizationId = await getCurrentUserOrganizationId();
      if (!organizationId) {
        this.clearCache();
        return null;
      }

      // Fetch directly from database to avoid circular dependency
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organizationid', organizationId)
        .order('createdAt', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to fetch projects');
      }

      const projects = (data || []).map(p => this.formatProject(p));

      const cached: CachedProjects = {
        projects,
        organizationId,
        cachedAt: Date.now(),
      };

      this.saveToStorage(cached);
      return cached;
    } catch (error) {
      console.error('[ProjectsCache] Error fetching projects:', error);
      // Don't clear cache on error - keep stale cache if available
      return this.loadFromStorage();
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): CachedProjects | null {
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (!cachedStr) return null;

      const cached = JSON.parse(cachedStr) as CachedProjects;
      
      // Validate structure
      if (!cached.projects || !Array.isArray(cached.projects) || !cached.organizationId || !cached.cachedAt) {
        console.warn('[ProjectsCache] Invalid cache structure, clearing');
        this.clearCache();
        return null;
      }

      return cached;
    } catch (error) {
      console.error('[ProjectsCache] Error loading cache from localStorage:', error);
      // Clear corrupted cache
      this.clearCache();
      return null;
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(cached: CachedProjects): void {
    try {
      const cachedStr = JSON.stringify(cached);
      localStorage.setItem(CACHE_KEY, cachedStr);
    } catch (error: any) {
      // Handle quota exceeded or other storage errors
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn('[ProjectsCache] localStorage quota exceeded, clearing old cache');
        // Try to clear and retry
        try {
          localStorage.removeItem(CACHE_KEY);
          localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        } catch (retryError) {
          console.error('[ProjectsCache] Failed to save cache even after clearing:', retryError);
        }
      } else {
        console.error('[ProjectsCache] Error saving cache to localStorage:', error);
      }
    }
  }

  /**
   * Check if cache exists and matches current organization
   */
  async isCacheForCurrentOrganization(organizationId?: string): Promise<boolean> {
    const currentOrgId = organizationId || await userProfileCache.getCachedOrganizationId();
    if (!currentOrgId) return false;
    
    const cached = this.loadFromStorage();
    if (!cached) return false;
    
    return cached.organizationId === currentOrgId;
  }
}

export const projectsCache = new ProjectsCacheService();
