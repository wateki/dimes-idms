import { userProfileCache } from './userProfileCache';
import { supabaseAuthService } from './supabaseAuthService';

/**
 * Shared helper function to get current user's organizationId
 * Uses cache first, falls back to direct fetch if cache miss
 * All services should use this instead of implementing their own version
 */
export async function getCurrentUserOrganizationId(): Promise<string> {
  // Try cache first (fast path)
  const cached = await userProfileCache.getCachedOrganizationId();
  if (cached) {
    return cached;
  }

  // Fallback to direct fetch if cache miss
  const currentUser = await supabaseAuthService.getCurrentUser();
  if (!currentUser) {
    throw new Error('Not authenticated');
  }

  const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
  if (!userProfile || !userProfile.organizationId) {
    throw new Error('User is not associated with an organization');
  }

  // Cache for next time
  if (userProfile.organizationId && currentUser.id) {
    userProfileCache.setCache(userProfile, userProfile.organizationId, currentUser.id);
  }

  return userProfile.organizationId;
}

