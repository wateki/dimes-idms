import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import { config } from '@/config/env';
import { supabaseUsageTrackingService } from './supabaseUsageTrackingService';

type User = Database['public']['Tables']['users']['Row'];
type Role = Database['public']['Tables']['roles']['Row'];
type UserRole = Database['public']['Tables']['user_roles']['Row'];
type UserProjectAccess = Database['public']['Tables']['user_project_access']['Row'];

export interface UserWithDetails extends User {
  roles: Array<{
    id: string;
    roleName: string;
    roleDescription: string | null;
    level: number;
    projectId: string | null;
    projectName?: string | null;
    country: string | null;
    isActive: boolean;
  }>;
  projectAccess: Array<{
    projectId: string;
    projectName?: string;
    accessLevel: string;
    isActive: boolean;
  }>;
}

export interface QueryUsersParams {
  search?: string;
  isActive?: boolean;
  projectId?: string;
  country?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UsersResponse {
  users: UserWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleAssignments?: Array<{
    roleId: string;
    projectId?: string;
    country?: string;
  }>;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  newPassword?: string;
  roleAssignments?: Array<{
    roleId: string;
    projectId?: string;
    country?: string;
  }>;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  level: number;
  isActive?: boolean;
  permissions?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  level?: number;
  isActive?: boolean;
  permissions?: string[];
}

// Helper function to convert database Role to interface Role
function formatRole(role: Role): {
  id: string;
  name: string;
  description?: string;
  level: number;
  isActive: boolean;
} {
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? undefined,
    level: role.level,
    isActive: role.isActive,
  };
}

class SupabaseUserManagementService {
  /**
   * Get current user's organizationId
   */
  private async getCurrentUserOrganizationId(): Promise<string> {
    console.log('[User Management Service] Getting current user organization ID...');
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      console.error('[User Management Service] Not authenticated - no current user');
      throw new Error('Not authenticated');
    }

    console.log(`[User Management Service] Current user: ${currentUser.id}`);
    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      console.error(`[User Management Service] User profile not found or no organization ID for user: ${currentUser.id}`);
      throw new Error('User is not associated with an organization');
    }

    console.log(`[User Management Service] Organization ID: ${userProfile.organizationId}`);
    return userProfile.organizationId;
  }

  private formatUserResponse(user: User, userRoles: UserRole[], projectAccess: UserProjectAccess[]): UserWithDetails {
    return {
      ...user,
      roles: userRoles.map(ur => ({
        id: ur.id,
        roleName: '', // Will be populated from join
        roleDescription: null,
        level: 0, // Will be populated from join
        projectId: ur.projectId,
        projectName: null,
        country: ur.country,
        isActive: ur.isActive,
      })),
      projectAccess: projectAccess.map(upa => ({
        projectId: upa.projectId,
        projectName: undefined, // Will be populated from join
        accessLevel: upa.accessLevel,
        isActive: upa.isActive,
      })),
    };
  }

  private async getUserWithDetails(userId: string): Promise<UserWithDetails> {
    console.log(`[User Management Service] getUserWithDetails called: ${userId}`);
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (userError || !user) {
      console.error(`[User Management Service] User not found or access denied: ${userId}`, userError?.message);
      throw new Error('User not found or access denied');
    }

    console.log(`[User Management Service] User found: ${user.id} (${user.email})`);

    // Get user roles with role details (filtered by organization)
    console.log(`[User Management Service] Fetching user roles for: ${userId}`);
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        *,
        role:roles(*),
        project:projects(id, name)
      `)
      .eq('userId', userId)
      .eq('organizationid', organizationId); // Filter by organization

    if (rolesError) {
      console.error(`[User Management Service] Failed to fetch user roles:`, rolesError.message);
      throw new Error(rolesError.message || 'Failed to fetch user roles');
    }

    console.log(`[User Management Service] Found ${userRoles?.length || 0} role(s) for user: ${userId}`);

    // Get project access (filtered by organization)
    console.log(`[User Management Service] Fetching project access for: ${userId}`);
    const { data: projectAccess, error: accessError } = await supabase
      .from('user_project_access')
      .select(`
        *,
        project:projects(id, name)
      `)
      .eq('userId', userId)
      .eq('organizationid', organizationId); // Filter by organization

    if (accessError) {
      console.error(`[User Management Service] Failed to fetch project access:`, accessError.message);
      throw new Error(accessError.message || 'Failed to fetch project access');
    }

    console.log(`[User Management Service] Found ${projectAccess?.length || 0} project access record(s) for user: ${userId}`);

    // Format response
    return {
      ...user,
      roles: (userRoles || []).map((ur: any) => ({
        id: ur.id,
        roleName: ur.role?.name || '',
        roleDescription: ur.role?.description || null,
        level: ur.role?.level || 0,
        projectId: ur.projectId,
        projectName: ur.project?.name || null,
        country: ur.country,
        isActive: ur.isActive,
      })),
      projectAccess: (projectAccess || []).map((upa: any) => ({
        projectId: upa.projectId,
        projectName: upa.project?.name || null,
        accessLevel: upa.accessLevel,
        isActive: upa.isActive,
      })),
    };
  }

  async getUsers(params: QueryUsersParams = {}): Promise<UsersResponse> {
    const startTime = Date.now();
    console.log('[User Management Service] getUsers called:', { params });
    
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    console.log(`[User Management Service] Fetching users - page: ${page}, limit: ${limit}, organization: ${organizationId}`);

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('organizationid', organizationId); // Filter by organization

    // Apply filters
    if (params.search) {
      console.log(`[User Management Service] Applying search filter: ${params.search}`);
      query = query.or(`email.ilike.%${params.search}%,firstName.ilike.%${params.search}%,lastName.ilike.%${params.search}%`);
    }

    if (params.isActive !== undefined) {
      console.log(`[User Management Service] Applying isActive filter: ${params.isActive}`);
      query = query.eq('isActive', params.isActive);
    }

    // Apply sorting
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    console.log(`[User Management Service] Sorting by: ${sortBy} (${sortOrder})`);
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(skip, skip + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('[User Management Service] Error fetching users:', error.message);
      throw new Error(error.message || 'Failed to fetch users');
    }

    console.log(`[User Management Service] Fetched ${users?.length || 0} users (total: ${count || 0})`);

    // For each user, get their roles and project access
    console.log(`[User Management Service] Enriching ${users?.length || 0} users with roles and project access...`);
    const enrichStartTime = Date.now();
    const usersWithDetails = await Promise.all(
      (users || []).map(async (user) => {
        // Get user roles (filtered by organization)
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select(`
            *,
            role:roles(*),
            project:projects(id, name)
          `)
          .eq('userId', user.id)
          .eq('organizationid', organizationId); // Filter by organization

        // Get project access (filtered by organization)
        const { data: projectAccess } = await supabase
          .from('user_project_access')
          .select(`
            *,
            project:projects(id, name)
          `)
          .eq('userId', user.id)
          .eq('organizationid', organizationId); // Filter by organization

        return {
          ...user,
          roles: (userRoles || []).map((ur: any) => ({
            id: ur.id,
            roleName: ur.role?.name || '',
            roleDescription: ur.role?.description || null,
            level: ur.role?.level || 0,
            projectId: ur.projectId,
            projectName: ur.project?.name || null,
            country: ur.country,
            isActive: ur.isActive,
          })),
          projectAccess: (projectAccess || []).map((upa: any) => ({
            projectId: upa.projectId,
            projectName: upa.project?.name || null,
            accessLevel: upa.accessLevel,
            isActive: upa.isActive,
          })),
        };
      })
    );
    const enrichDuration = Date.now() - enrichStartTime;
    const totalDuration = Date.now() - startTime;
    console.log(`[User Management Service] getUsers completed in ${totalDuration}ms (enrichment: ${enrichDuration}ms)`);

    return {
      users: usersWithDetails,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getUserById(userId: string): Promise<UserWithDetails> {
    console.log(`[User Management Service] getUserById called: ${userId}`);
    return this.getUserWithDetails(userId);
  }

  async createUser(userData: CreateUserRequest): Promise<UserWithDetails> {
    const startTime = Date.now();
    console.log('[User Management Service] createUser called:', { email: userData.email, firstName: userData.firstName, lastName: userData.lastName });
    
    // Multi-tenant: Get organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Check if email already exists (within organization)
    console.log(`[User Management Service] Checking if email already exists: ${userData.email}`);
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .eq('organizationid', organizationId) // Check within organization
      .single();

    if (existingUser) {
      console.error(`[User Management Service] User with email ${userData.email} already exists (ID: ${existingUser.id})`);
      throw new Error('User with this email already exists in your organization');
    }

    console.log(`[User Management Service] Email ${userData.email} is available`);

    // Get current user for createdBy
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      console.error('[User Management Service] Not authenticated - no current user');
      throw new Error('Not authenticated');
    }
    
    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      console.error(`[User Management Service] User profile not found or no organization ID for user: ${currentUser.id}`);
      throw new Error('User profile not found or user is not associated with an organization');
    }

    console.log(`[User Management Service] Creating auth user via edge function for: ${userData.email}`);
    // Create user in Supabase Auth using Edge Function (Admin API)
    // Get session token for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[User Management Service] Not authenticated - no session');
      throw new Error('Not authenticated');
    }

    const edgeFunctionUrl = `${config.SUPABASE_URL}/functions/v1/user-management`;
    console.log(`[User Management Service] Calling edge function: ${edgeFunctionUrl}`);
    const edgeFunctionStartTime = Date.now();
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': config.SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        action: 'create_auth_user',
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        emailConfirmed: true, // Auto-confirm for admin-created users
      }),
    });
    const edgeFunctionDuration = Date.now() - edgeFunctionStartTime;

    const edgeFunctionData = await response.json();
    console.log(`[User Management Service] Edge function response (${edgeFunctionDuration}ms):`, { 
      ok: response.ok, 
      status: response.status,
      success: edgeFunctionData?.success,
      hasError: !!edgeFunctionData?.error 
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorMessage = edgeFunctionData?.error || `HTTP ${response.status}: ${response.statusText}`;
      const errorDetails = edgeFunctionData?.details ? ` - ${edgeFunctionData.details}` : '';
      console.error(`[User Management Service] Edge function returned error: ${errorMessage}${errorDetails}`);
      throw new Error(`Failed to create auth user: ${errorMessage}${errorDetails}`);
    }

    // Check if response contains an error
    if (edgeFunctionData && 'error' in edgeFunctionData) {
      console.error(`[User Management Service] Edge function response contains error:`, edgeFunctionData.error);
      throw new Error(`Failed to create auth user: ${edgeFunctionData.error}${edgeFunctionData.details ? ` - ${edgeFunctionData.details}` : ''}`);
    }

    if (!edgeFunctionData?.success || !edgeFunctionData?.authUserId) {
      console.error(`[User Management Service] Invalid edge function response:`, edgeFunctionData);
      throw new Error('Failed to create auth user: Invalid response from edge function');
    }

    const authUserId = edgeFunctionData.authUserId;
    console.log(`[User Management Service] Auth user created: ${authUserId}, creating user profile...`);

    const now = new Date().toISOString();
    
    // Create profile record linked to the auth user
    const profileStartTime = Date.now();
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        auth_user_id: authUserId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: '', // Not used with Supabase Auth
        organizationId: organizationId, // Multi-tenant: Set organizationId
        isActive: true,
        createdBy: userProfile.id,
        updatedBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['users']['Insert'])
      .select()
      .single();
    const profileDuration = Date.now() - profileStartTime;

    if (userError || !newUser) {
      console.error(`[User Management Service] Failed to create user profile after ${profileDuration}ms:`, userError?.message || 'No user returned');
      // If profile creation fails, clean up the auth user via edge function
      console.log(`[User Management Service] Cleaning up auth user: ${authUserId}`);
      try {
        const { data: { session: cleanupSession } } = await supabase.auth.getSession();
        if (cleanupSession) {
          const cleanupUrl = `${config.SUPABASE_URL}/functions/v1/user-management`;
          const cleanupStartTime = Date.now();
          const cleanupResponse = await fetch(cleanupUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cleanupSession.access_token}`,
              'apikey': config.SUPABASE_ANON_KEY || '',
            },
            body: JSON.stringify({
              action: 'delete_auth_user',
              authUserId: authUserId,
            }),
          });
          const cleanupDuration = Date.now() - cleanupStartTime;
          console.log(`[User Management Service] Cleanup response (${cleanupDuration}ms):`, { ok: cleanupResponse.ok, status: cleanupResponse.status });
        }
      } catch (cleanupError) {
        console.error('[User Management Service] Failed to cleanup auth user after profile creation failure:', cleanupError);
      }
      // Handle subscription limit errors from RLS policies, and preserve other errors
      const { handleSubscriptionError } = await import('@/utils/subscriptionErrorHandler');
      throw await handleSubscriptionError(userError || { message: 'Failed to create user profile' }, 'users', 'create');
    }

    console.log(`[User Management Service] User profile created successfully: ${newUser.id}`);

    // Assign roles if provided
    if (userData.roleAssignments && userData.roleAssignments.length > 0) {
      console.log(`[User Management Service] Assigning ${userData.roleAssignments.length} role(s) to user: ${newUser.id}`);
      const roleInserts = userData.roleAssignments.map(assignment => ({
        id: crypto.randomUUID(),
        userId: newUser.id,
        roleId: assignment.roleId,
        projectId: assignment.projectId || null,
        country: assignment.country || null,
        organizationId: organizationId, // Multi-tenant: Set organizationId
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['user_roles']['Insert']));

      const rolesStartTime = Date.now();
      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(roleInserts);
      const rolesDuration = Date.now() - rolesStartTime;

      if (rolesError) {
        console.error(`[User Management Service] Failed to assign roles after ${rolesDuration}ms:`, rolesError.message);
        // Rollback user creation
        console.log(`[User Management Service] Rolling back user creation: ${newUser.id}`);
        await supabase.from('users').delete().eq('id', newUser.id);
        throw new Error(rolesError.message || 'Failed to assign roles');
      }

      console.log(`[User Management Service] Roles assigned successfully in ${rolesDuration}ms`);
    }

    // Track usage: increment users count if user is active
    if (newUser.isActive) {
      try {
        console.log(`[User Management Service] Tracking usage increment for active user: ${newUser.id}`);
        await supabaseUsageTrackingService.incrementUsage('users');
      } catch (error) {
        console.error('[User Management Service] Failed to track user creation:', error);
        // Don't throw - tracking failure shouldn't break user creation
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[User Management Service] createUser completed in ${totalDuration}ms: ${newUser.id}`);
    return this.getUserWithDetails(newUser.id);
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<UserWithDetails> {
    const startTime = Date.now();
    console.log(`[User Management Service] updateUser called: ${userId}`, { 
      updateFields: Object.keys(userData),
      hasRoleAssignments: !!userData.roleAssignments 
    });
    
    // Multi-tenant: Verify ownership first
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      console.error('[User Management Service] Not authenticated - no current user');
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      console.error(`[User Management Service] User profile not found or no organization ID for user: ${currentUser.id}`);
      throw new Error('User profile not found or user is not associated with an organization');
    }

    const updateData: any = {
      updatedBy: userProfile.id,
      updatedAt: new Date().toISOString(),
    };

    if (userData.firstName) updateData.firstName = userData.firstName;
    if (userData.lastName) updateData.lastName = userData.lastName;
    if (userData.isActive !== undefined) updateData.isActive = userData.isActive;

    // Multi-tenant: Ensure ownership
    console.log(`[User Management Service] Updating user profile: ${userId}`);
    const updateStartTime = Date.now();
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .eq('organizationid', organizationId); // Ensure ownership
    const updateDuration = Date.now() - updateStartTime;

    if (updateError) {
      console.error(`[User Management Service] Failed to update user after ${updateDuration}ms:`, updateError.message);
      throw new Error(updateError.message || 'Failed to update user');
    }

    console.log(`[User Management Service] User profile updated successfully in ${updateDuration}ms`);

    // Update role assignments if provided
    if (userData.roleAssignments && userData.roleAssignments.length > 0) {
      console.log(`[User Management Service] Updating role assignments: removing existing, adding ${userData.roleAssignments.length} new`);
      // Remove existing role assignments (filtered by organization)
      await supabase
        .from('user_roles')
        .delete()
        .eq('userId', userId)
        .eq('organizationid', organizationId); // Filter by organization

      // Add new role assignments
      const now = new Date().toISOString();
      const roleInserts = userData.roleAssignments.map(assignment => ({
        id: crypto.randomUUID(),
        userId,
        roleId: assignment.roleId,
        projectId: assignment.projectId || null,
        country: assignment.country || null,
        organizationId: organizationId, // Multi-tenant: Set organizationId
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['user_roles']['Insert']));

      const rolesStartTime = Date.now();
      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(roleInserts);
      const rolesDuration = Date.now() - rolesStartTime;

      if (rolesError) {
        console.error(`[User Management Service] Failed to update role assignments after ${rolesDuration}ms:`, rolesError.message);
        throw new Error(rolesError.message || 'Failed to update role assignments');
      }

      console.log(`[User Management Service] Role assignments updated successfully in ${rolesDuration}ms`);
    }

    // Track usage: handle isActive changes
    if (userData.isActive !== undefined) {
      try {
        console.log(`[User Management Service] Checking user status change for usage tracking: ${userId}`);
        // Get current user state before update to determine if we need to increment or decrement
        const { data: currentUser } = await supabase
          .from('users')
          .select('isActive')
          .eq('id', userId)
          .eq('organizationid', organizationId)
          .single();

        if (currentUser) {
          const wasActive = currentUser.isActive;
          const isNowActive = userData.isActive;

          if (!wasActive && isNowActive) {
            // User activated - increment
            console.log(`[User Management Service] User activated, incrementing usage: ${userId}`);
            await supabaseUsageTrackingService.incrementUsage('users');
          } else if (wasActive && !isNowActive) {
            // User deactivated - decrement
            console.log(`[User Management Service] User deactivated, decrementing usage: ${userId}`);
            await supabaseUsageTrackingService.decrementUsage('users');
          } else {
            console.log(`[User Management Service] User status unchanged (wasActive: ${wasActive}, isNowActive: ${isNowActive})`);
          }
        }
      } catch (error) {
        console.error('[User Management Service] Failed to track user status change:', error);
        // Don't throw - tracking failure shouldn't break user update
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[User Management Service] updateUser completed in ${totalDuration}ms: ${userId}`);
    return this.getUserWithDetails(userId);
  }

  async deleteUser(userId: string): Promise<void> {
    const startTime = Date.now();
    console.log(`[User Management Service] deleteUser called: ${userId}`);
    
    // Multi-tenant: Verify ownership first
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      console.error('[User Management Service] Not authenticated - no current user');
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      console.error(`[User Management Service] User profile not found or no organization ID for user: ${currentUser.id}`);
      throw new Error('User profile not found or user is not associated with an organization');
    }

    // Prevent self-deletion
    if (userId === userProfile.id) {
      console.error(`[User Management Service] Self-deletion attempted by user: ${userId}`);
      throw new Error('Cannot delete your own account');
    }
    
    // Verify user belongs to same organization and get isActive status
    console.log(`[User Management Service] Verifying target user: ${userId}`);
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, organizationid, isActive')
      .eq('id', userId)
      .eq('organizationid', organizationId)
      .single();

    if (userError || !targetUser) {
      console.error(`[User Management Service] Target user not found or access denied: ${userId}`, userError?.message);
      throw new Error('User not found or access denied');
    }

    console.log(`[User Management Service] Target user verified: ${targetUser.id} (isActive: ${targetUser.isActive})`);

    const now = new Date().toISOString();

    // Soft delete user and related data in parallel
    console.log(`[User Management Service] Soft deleting user and related data: ${userId}`);
    const softDeleteStartTime = Date.now();
    const [userUpdate, rolesUpdate, accessUpdate, permissionsDelete] = await Promise.all([
      // Soft delete user
      supabase
        .from('users')
        .update({
          isActive: false,
          updatedBy: userProfile.id,
          updatedAt: now,
        })
        .eq('id', userId),
      
      // Soft delete user roles
      supabase
        .from('user_roles')
        .update({
          isActive: false,
          updatedAt: now,
        })
        .eq('userId', userId),
      
      // Soft delete project access
      supabase
        .from('user_project_access')
        .update({
          isActive: false,
          updatedAt: now,
        })
        .eq('userId', userId),
      
      // Delete user permissions (direct permissions, not role-based)
      supabase
        .from('user_permissions')
        .delete()
        .eq('userId', userId),
    ]);
    const softDeleteDuration = Date.now() - softDeleteStartTime;
    console.log(`[User Management Service] Soft delete operations completed in ${softDeleteDuration}ms`);

    if (userUpdate.error) {
      console.error(`[User Management Service] Failed to soft delete user:`, userUpdate.error.message);
      throw new Error(userUpdate.error.message || 'Failed to delete user');
    }

    console.log(`[User Management Service] User soft deleted successfully`);

    // Track usage: decrement users count if user was active
    if (targetUser.isActive) {
      try {
        console.log(`[User Management Service] User was active, decrementing usage: ${userId}`);
        await supabaseUsageTrackingService.decrementUsage('users');
      } catch (error) {
        console.error('[User Management Service] Failed to track user deletion:', error);
        // Don't throw - tracking failure shouldn't break user deletion
      }
    }

    if (rolesUpdate.error) {
      console.warn('[User Management Service] Failed to deactivate user roles:', rolesUpdate.error.message);
    }

    if (accessUpdate.error) {
      console.warn('[User Management Service] Failed to deactivate project access:', accessUpdate.error.message);
    }

    if (permissionsDelete.error) {
      console.warn('[User Management Service] Failed to delete user permissions:', permissionsDelete.error.message);
    }

    // Delete user from Supabase Auth using Edge Function (Admin API)
    console.log(`[User Management Service] Fetching auth_user_id for deletion: ${userId}`);
    const { data: deletedTargetUser } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('id', userId)
      .single();

    if (deletedTargetUser?.auth_user_id) {
      console.log(`[User Management Service] Deleting auth user via edge function: ${deletedTargetUser.auth_user_id}`);
      try {
        // Get session token for authorization
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('[User Management Service] Failed to delete auth user: Not authenticated');
          return;
        }

        const deleteUrl = `${config.SUPABASE_URL}/functions/v1/user-management`;
        const authDeleteStartTime = Date.now();
        const deleteResponse = await fetch(deleteUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': config.SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            action: 'delete_auth_user',
            userId: userId,
            authUserId: deletedTargetUser.auth_user_id,
          }),
        });
        const authDeleteDuration = Date.now() - authDeleteStartTime;

        const deleteData = await deleteResponse.json();

        // Handle errors
        if (!deleteResponse.ok || (deleteData && 'error' in deleteData)) {
          const errorMessage = deleteData?.error || `HTTP ${deleteResponse.status}: ${deleteResponse.statusText}`;
          const errorDetails = deleteData?.details ? ` - ${deleteData.details}` : '';
          console.warn(`[User Management Service] Failed to delete auth user after ${authDeleteDuration}ms:`, errorMessage, errorDetails);
          // Don't throw - profile is already soft deleted
        } else {
          console.log(`[User Management Service] Auth user deleted successfully in ${authDeleteDuration}ms`);
        }
      } catch (error) {
        console.warn('[User Management Service] Failed to delete auth user:', error instanceof Error ? error.message : String(error));
        // Don't throw - profile is already soft deleted
      }
    } else {
      console.warn(`[User Management Service] No auth_user_id found for user: ${userId}, skipping auth deletion`);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[User Management Service] deleteUser completed in ${totalDuration}ms: ${userId}`);
  }

  async getAvailableRoles(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    level: number;
    isActive: boolean;
  }>> {
    const startTime = Date.now();
    console.log('[User Management Service] getAvailableRoles called');
    
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('isActive', true)
      .eq('organizationid', organizationId) // Filter by organization
      .order('level', { ascending: true });

    if (error) {
      console.error('[User Management Service] Failed to fetch roles:', error.message);
      throw new Error(error.message || 'Failed to fetch roles');
    }

    const duration = Date.now() - startTime;
    console.log(`[User Management Service] getAvailableRoles completed in ${duration}ms: ${data?.length || 0} role(s) found`);

    // Map to convert null to undefined for description and exclude extra fields
    return (data || []).map(role => ({
      id: role.id,
      name: role.name,
      description: role.description ?? undefined,
      level: role.level,
      isActive: role.isActive,
    }));
  }

  async createRole(roleData: CreateRoleRequest): Promise<{
    id: string;
    name: string;
    description?: string;
    level: number;
    isActive: boolean;
  }> {
    // Multi-tenant: Get organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Check if role name already exists (within organization)
    const { data: existing } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleData.name)
      .eq('organizationid', organizationId) // Check within organization
      .single();

    if (existing) {
      throw new Error('Role with this name already exists in your organization');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('roles')
      .insert({
        id: crypto.randomUUID(),
        name: roleData.name,
        description: roleData.description || null,
        level: roleData.level,
        isActive: roleData.isActive ?? true,
        organizationId: organizationId, // Multi-tenant: Set organizationId
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['roles']['Insert'])
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create role');
    }

    // Assign permissions if provided
    if (roleData.permissions && roleData.permissions.length > 0) {
      const permissionInserts = roleData.permissions.map(permissionId => ({
        id: crypto.randomUUID(),
        roleId: data.id,
        permissionId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['role_permissions']['Insert']));

      await supabase.from('role_permissions').insert(permissionInserts);
    }

    return formatRole(data);
  }

  async updateRole(roleId: string, roleData: UpdateRoleRequest): Promise<{
    id: string;
    name: string;
    description?: string;
    level: number;
    isActive: boolean;
  }> {
    // Multi-tenant: Verify ownership
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (roleData.name !== undefined) updateData.name = roleData.name;
    if (roleData.description !== undefined) updateData.description = roleData.description || null;
    if (roleData.level !== undefined) updateData.level = roleData.level;
    if (roleData.isActive !== undefined) updateData.isActive = roleData.isActive;

    // Multi-tenant: Ensure ownership
    const { data, error } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', roleId)
      .eq('organizationid', organizationId) // Ensure ownership
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update role or access denied');
    }

    return formatRole(data);
  }

  async deleteRole(roleId: string): Promise<void> {
    // Multi-tenant: Verify ownership
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { error } = await supabase
      .from('roles')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', roleId)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) {
      throw new Error(error.message || 'Failed to delete role or access denied');
    }
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    // Multi-tenant: Verify role belongs to user's organization
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, organizationid')
      .eq('id', roleId)
      .eq('organizationid', organizationId)
      .single();

    if (roleError || !role) {
      throw new Error('Role not found or access denied');
    }
    
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permissionId')
      .eq('roleId', roleId)
      .eq('isActive', true);

    if (error) {
      throw new Error(error.message || 'Failed to fetch role permissions');
    }

    return (data || []).map(rp => rp.permissionId);
  }

  async getProjectUsers(projectId: string, params: QueryUsersParams = {}): Promise<UsersResponse> {
    // Multi-tenant: Verify project ownership first
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organizationid')
      .eq('id', projectId)
      .eq('organizationid', organizationId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }
    
    // Get users with access to this project (filtered by organization)
    const { data: projectAccess, error: accessError } = await supabase
      .from('user_project_access')
      .select('userId')
      .eq('projectId', projectId)
      .eq('organizationid', organizationId) // Filter by organization
      .eq('isActive', true);

    if (accessError) {
      throw new Error(accessError.message || 'Failed to fetch project users');
    }

    const userIds = (projectAccess || []).map(pa => pa.userId);

    if (userIds.length === 0) {
      return {
        users: [],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          pages: 0,
        },
      };
    }

    // Get users with filters (filtered by organization)
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .in('id', userIds)
      .eq('organizationid', organizationId); // Filter by organization

    if (params.search) {
      query = query.or(`email.ilike.%${params.search}%,firstName.ilike.%${params.search}%,lastName.ilike.%${params.search}%`);
    }

    if (params.isActive !== undefined) {
      query = query.eq('isActive', params.isActive);
    }

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range(skip, skip + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      throw new Error(error.message || 'Failed to fetch project users');
    }

    // Get details for each user
    const usersWithDetails = await Promise.all(
      (users || []).map(user => this.getUserWithDetails(user.id))
    );

    return {
      users: usersWithDetails,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async updateProjectAccessLevel(userId: string, projectId: string, accessLevel: 'read' | 'write' | 'admin'): Promise<void> {
    // Multi-tenant: Verify project and user belong to same organization
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organizationid')
      .eq('id', projectId)
      .eq('organizationid', organizationId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }
    
    // Verify user belongs to same organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organizationid')
      .eq('id', userId)
      .eq('organizationid', organizationId)
      .single();

    if (userError || !user) {
      throw new Error('User not found or access denied');
    }
    
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('user_project_access')
      .upsert({
        id: crypto.randomUUID(),
        userId,
        projectId,
        accessLevel,
        organizationId: organizationId, // Multi-tenant: Set organizationId
        isActive: true,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['user_project_access']['Insert'], {
        onConflict: 'userId,projectId',
      });

    if (error) {
      throw new Error(error.message || 'Failed to update project access level');
    }
  }

  async removeUserFromProject(projectId: string, userId: string): Promise<void> {
    // Multi-tenant: Verify ownership
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organizationid')
      .eq('id', projectId)
      .eq('organizationid', organizationId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }
    
    // Remove project access (filtered by organization)
    await supabase
      .from('user_project_access')
      .delete()
      .eq('userId', userId)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Ensure ownership

    // Remove project-specific roles (filtered by organization)
    await supabase
      .from('user_roles')
      .delete()
      .eq('userId', userId)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Ensure ownership
  }
}

export const supabaseUserManagementService = new SupabaseUserManagementService();

