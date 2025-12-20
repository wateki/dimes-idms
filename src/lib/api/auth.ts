import { User } from '@/types/dashboard';
import { supabaseAuthService } from '@/services/supabaseAuthService';
import type { Session } from '@supabase/supabase-js';

interface LoginResponse {
  session: Session;
  user: User;
}

interface LoginResult {
  success: boolean;
  error?: string;
  data?: LoginResponse;
}

/**
 * Pure Supabase-based authentication API
 * All authentication is handled through Supabase Auth
 */
class AuthAPI {
  /**
   * Sign in with email and password
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const { session, user: authUser, error } = await supabaseAuthService.signIn(email, password);

      if (error || !session || !authUser) {
        return {
          success: false,
          error: error?.message || 'Invalid email or password',
        };
      }

      // Fetch full user profile with roles and permissions
      const userProfile = await supabaseAuthService.getUserProfile(authUser.id);

      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found',
        };
      }

      return {
        success: true,
        data: {
          session,
          user: userProfile,
        },
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed. Please try again.',
      };
    }
  }

  /**
   * Sign out
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAuthService.signOut();
      
      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to sign out',
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error.message || 'Logout failed',
      };
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    return supabaseAuthService.getSession();
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<User> {
    const authUser = await supabaseAuthService.getCurrentUser();
    
    if (!authUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(authUser.id);
    
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    return userProfile;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    const updatedProfile = await supabaseAuthService.updateUserProfile({
      firstName: updates.firstName,
      lastName: updates.lastName,
      email: updates.email,
    });

    if (!updatedProfile) {
      throw new Error('Failed to update profile');
    }

    return updatedProfile;
  }

  /**
   * Change password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Note: Supabase Auth doesn't require current password for password change
    // You may want to add validation on the backend if needed
    await supabaseAuthService.changePassword(newPassword);
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ) {
    return supabaseAuthService.onAuthStateChange(callback);
  }

  /**
   * Utility method to check if session is valid
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  }
}

export const authAPI = new AuthAPI();
