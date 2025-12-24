import { supabaseAuthService } from './supabaseAuthService';
import type { User } from '@/types/dashboard';

interface CachedUserProfile {
  user: User;
  organizationId: string;
  authUserId: string;
  cachedAt: number;
}

const CACHE_KEY = 'ics_user_profile_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class UserProfileCacheService {
  private refreshPromise: Promise<CachedUserProfile | null> | null = null;

  /**
   * Get cached user profile and organizationId from localStorage
   * Returns cached value if available and fresh, otherwise fetches and caches
   */
  async getCachedProfile(): Promise<{ user: User; organizationId: string } | null> {
    // Try to load from localStorage first
    const cached = this.loadFromStorage();
    
    // Check if cache is valid and for current user
    if (cached && this.isCacheValid(cached)) {
      const isForCurrentUser = await this.isCacheForCurrentUser(cached.authUserId);
      if (isForCurrentUser) {
        return {
          user: cached.user,
          organizationId: cached.organizationId,
        };
      } else {
        // Cache is for different user, clear it
        this.clearCache();
      }
    }

    // If already refreshing, wait for that promise
    if (this.refreshPromise) {
      const result = await this.refreshPromise;
      if (result) {
        return {
          user: result.user,
          organizationId: result.organizationId,
        };
      }
      return null;
    }

    // Fetch and cache
    this.refreshPromise = this.fetchAndCache();
    const result = await this.refreshPromise;
    this.refreshPromise = null;

    if (result) {
      return {
        user: result.user,
        organizationId: result.organizationId,
      };
    }

    return null;
  }

  /**
   * Get cached organizationId only (faster, uses cache if available)
   */
  async getCachedOrganizationId(): Promise<string | null> {
    const cached = await this.getCachedProfile();
    return cached?.organizationId || null;
  }

  /**
   * Set cache explicitly (called from AuthContext on auth changes)
   */
  setCache(user: User, organizationId: string, authUserId: string): void {
    const cached: CachedUserProfile = {
      user,
      organizationId,
      authUserId,
      cachedAt: Date.now(),
    };
    this.saveToStorage(cached);
  }

  /**
   * Clear cache (called on logout or auth errors)
   */
  clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('[UserProfileCache] Error clearing cache from localStorage:', error);
    }
    this.refreshPromise = null;
  }

  /**
   * Force refresh cache (bypasses cache validity check)
   */
  async refreshCache(): Promise<{ user: User; organizationId: string } | null> {
    this.clearCache();
    this.refreshPromise = null;
    return await this.getCachedProfile();
  }

  /**
   * Check if cache is valid (not expired)
   */
  private isCacheValid(cached: CachedUserProfile): boolean {
    const age = Date.now() - cached.cachedAt;
    return age < CACHE_DURATION;
  }

  /**
   * Fetch user profile and organizationId from database
   */
  private async fetchAndCache(): Promise<CachedUserProfile | null> {
    try {
      const authUser = await supabaseAuthService.getCurrentUser();
      if (!authUser) {
        this.clearCache();
        return null;
      }

      const userProfile = await supabaseAuthService.getUserProfile(authUser.id);
      if (!userProfile || !userProfile.organizationId) {
        this.clearCache();
        return null;
      }

      const cached: CachedUserProfile = {
        user: userProfile,
        organizationId: userProfile.organizationId,
        authUserId: authUser.id,
        cachedAt: Date.now(),
      };

      this.saveToStorage(cached);
      return cached;
    } catch (error) {
      console.error('[UserProfileCache] Error fetching profile:', error);
      // Don't clear cache on error - keep stale cache if available
      return this.loadFromStorage();
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): CachedUserProfile | null {
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (!cachedStr) return null;

      const cached = JSON.parse(cachedStr) as CachedUserProfile;
      
      // Validate structure
      if (!cached.user || !cached.organizationId || !cached.authUserId || !cached.cachedAt) {
        console.warn('[UserProfileCache] Invalid cache structure, clearing');
        this.clearCache();
        return null;
      }

      return cached;
    } catch (error) {
      console.error('[UserProfileCache] Error loading cache from localStorage:', error);
      // Clear corrupted cache
      this.clearCache();
      return null;
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(cached: CachedUserProfile): void {
    try {
      const cachedStr = JSON.stringify(cached);
      localStorage.setItem(CACHE_KEY, cachedStr);
    } catch (error: any) {
      // Handle quota exceeded or other storage errors
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn('[UserProfileCache] localStorage quota exceeded, clearing old cache');
        // Try to clear and retry
        try {
          localStorage.removeItem(CACHE_KEY);
          localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        } catch (retryError) {
          console.error('[UserProfileCache] Failed to save cache even after clearing:', retryError);
        }
      } else {
        console.error('[UserProfileCache] Error saving cache to localStorage:', error);
      }
    }
  }

  /**
   * Get current auth user ID (lightweight, no cache needed)
   */
  async getCurrentAuthUserId(): Promise<string | null> {
    const authUser = await supabaseAuthService.getCurrentUser();
    return authUser?.id || null;
  }

  /**
   * Check if cache exists and matches current auth user
   */
  async isCacheForCurrentUser(authUserId?: string): Promise<boolean> {
    const currentAuthUserId = authUserId || await this.getCurrentAuthUserId();
    if (!currentAuthUserId) return false;
    
    const cached = this.loadFromStorage();
    if (!cached) return false;
    
    return cached.authUserId === currentAuthUserId;
  }
}

export const userProfileCache = new UserProfileCacheService();
