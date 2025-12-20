import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import type { User, UserRole, ProjectAccess } from '@/types/dashboard';
import type { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserRoleRow = Database['public']['Tables']['user_roles']['Row'];
type RoleRow = Database['public']['Tables']['roles']['Row'];
type PermissionRow = Database['public']['Tables']['permissions']['Row'];
type UserPermissionRow = Database['public']['Tables']['user_permissions']['Row'];
type RolePermissionRow = Database['public']['Tables']['role_permissions']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type UserProjectAccessRow = Database['public']['Tables']['user_project_access']['Row'];

/**
 * Supabase-based authentication service
 * Handles authentication, user data queries, and profile management
 */
class SupabaseAuthService {
  /**
   * Sign in with email and password using Supabase Auth
   */
  async signIn(email: string, password: string): Promise<{
    session: Session | null;
    user: SupabaseUser | null;
    error: AuthError | null;
  }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { session: null, user: null, error };
    }

    // Update last login time in users table
    if (data.user) {
      await this.updateLastLogin(data.user.id);
    }

    return { session: data.session, user: data.user, error: null };
  }

  /**
   * Sign out using Supabase Auth
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return data.session;
  }

  /**
   * Get current user from Supabase Auth
   */
  async getCurrentUser(): Promise<SupabaseUser | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return data.user;
  }

  /**
   * Get user profile by Supabase Auth user ID
   * This is the primary method to link Supabase Auth users to their profile
   */
  async getUserByAuthId(authUserId: string): Promise<UserRow | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .eq('isActive', true)
      .single();

    if (error) {
      console.error('Error fetching user by auth_user_id:', error);
      return null;
    }

    return data;
  }

  /**
   * Get user by email (for backwards compatibility or admin operations)
   * Note: Email should match between Supabase Auth and public.users
   */
  async getUserByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('isActive', true)
      .single();

    if (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }

    return data;
  }

  /**
   * Get user profile with full details including roles and permissions
   * Uses the Supabase Auth user ID to fetch from the public.users profile table
   */
  async getUserProfile(authUserId: string): Promise<User | null> {
    try {
      // Fetch user from users table by auth_user_id (links Supabase Auth to profile)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('isActive', true)
        .single();

      if (userError || !user) {
        console.error('Error fetching user:', userError);
        return null;
      }

      // Fetch user roles with role details and project info
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          *,
          role:roles (
            id,
            name,
            description,
            level,
            isActive
          ),
          project:projects (
            id,
            name
          )
        `)
        .eq('userId', user.id)
        .eq('isActive', true);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      }

      // Fetch user permissions (direct permissions)
      const { data: userPermissions, error: userPermsError } = await supabase
        .from('user_permissions')
        .select(`
          *,
          permission:permissions (
            id,
            name,
            resource,
            action,
            scope
          )
        `)
        .eq('userId', user.id)
        .eq('isActive', true);

      if (userPermsError) {
        console.error('Error fetching user permissions:', userPermsError);
      }

      // Fetch role permissions (permissions from roles)
      const roleIds = userRoles?.map(ur => ur.roleId) || [];
      let rolePermissions: PermissionRow[] = [];

      if (roleIds.length > 0) {
        const { data: rolePerms, error: rolePermsError } = await supabase
          .from('role_permissions')
          .select(`
            *,
            permission:permissions (
              id,
              name,
              resource,
              action,
              scope
            )
          `)
          .in('roleId', roleIds)
          .eq('isActive', true);

        if (rolePermsError) {
          console.error('Error fetching role permissions:', rolePermsError);
        } else {
          // Extract unique permissions from role permissions
          const uniquePerms = new Map<string, PermissionRow>();
          rolePerms?.forEach(rp => {
            if (rp.permission && typeof rp.permission === 'object' && !Array.isArray(rp.permission)) {
              const perm = rp.permission as PermissionRow;
              uniquePerms.set(perm.id, perm);
            }
          });
          rolePermissions = Array.from(uniquePerms.values());
        }
      }

      // Fetch project access
      const { data: projectAccess, error: projectAccessError } = await supabase
        .from('user_project_access')
        .select(`
          *,
          project:projects (
            id,
            name
          )
        `)
        .eq('userId', user.id)
        .eq('isActive', true);

      if (projectAccessError) {
        console.error('Error fetching project access:', projectAccessError);
      }

      // Transform user roles
      const transformedRoles: UserRole[] = (userRoles || []).map(ur => {
        const role = ur.role as RoleRow;
        const project = ur.project as ProjectRow | null;
        
        return {
          id: ur.id,
          roleName: role?.name || '',
          roleDescription: role?.description || undefined,
          level: role?.level || 0,
          projectId: ur.projectId || undefined,
          projectName: project?.name || undefined,
          country: ur.country || undefined,
          isActive: ur.isActive,
        };
      });

      // Transform project access
      const transformedProjectAccess: ProjectAccess[] = (projectAccess || []).map(pa => {
        const project = pa.project as ProjectRow | null;
        return {
          projectId: pa.projectId,
          projectName: project?.name || undefined,
          accessLevel: pa.accessLevel as 'read' | 'write' | 'admin',
          isActive: pa.isActive,
        };
      });

      // Collect all permissions (from roles and direct user permissions)
      const allPermissions = new Set<string>();
      
      // Add role permissions
      rolePermissions.forEach(perm => {
        allPermissions.add(perm.name);
      });

      // Add direct user permissions
      (userPermissions || []).forEach(up => {
        const perm = up.permission as PermissionRow;
        if (perm) {
          allPermissions.add(perm.name);
        }
      });

      // Build the User object
      const userProfile: User = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: transformedRoles,
        projectAccess: transformedProjectAccess,
        permissions: Array.from(allPermissions),
      };

      return userProfile;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
    }
  ): Promise<User | null> {
    const authUser = await this.getCurrentUser();
    if (!authUser) {
      throw new Error('Not authenticated');
    }

    // Update in users table using auth_user_id
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('auth_user_id', authUser.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw new Error(error.message || 'Failed to update profile');
    }

    // Update email in Supabase Auth if email changed
    if (updates.email && updates.email !== authUser.email) {
      const { error: updateEmailError } = await supabase.auth.updateUser({
        email: updates.email,
      });
      if (updateEmailError) {
        console.error('Error updating email in auth:', updateEmailError);
        // Don't throw - profile update succeeded, email update can be retried
      }
    }

    // Fetch updated profile with roles and permissions
    return this.getUserProfile(authUser.id);
  }

  /**
   * Update last login time
   */
  async updateLastLogin(authUserId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('auth_user_id', authUserId);

    if (error) {
      console.error('Error updating last login:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Change user password using Supabase Auth
   */
  async changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Error changing password:', error);
      throw new Error(error.message || 'Failed to change password');
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  /**
   * Verify user exists and is active
   */
  async verifyUser(): Promise<boolean> {
    const authUser = await this.getCurrentUser();
    if (!authUser) {
      return false;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .eq('isActive', true)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }
}

export const supabaseAuthService = new SupabaseAuthService();
