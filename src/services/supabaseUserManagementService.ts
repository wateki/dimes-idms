import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import { config } from '@/config/env';

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
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User is not associated with an organization');
    }

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
      throw new Error('User not found or access denied');
    }

    // Get user roles with role details (filtered by organization)
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
      throw new Error(rolesError.message || 'Failed to fetch user roles');
    }

    // Get project access (filtered by organization)
    const { data: projectAccess, error: accessError } = await supabase
      .from('user_project_access')
      .select(`
        *,
        project:projects(id, name)
      `)
      .eq('userId', userId)
      .eq('organizationid', organizationId); // Filter by organization

    if (accessError) {
      throw new Error(accessError.message || 'Failed to fetch project access');
    }

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
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('organizationid', organizationId); // Filter by organization

    // Apply filters
    if (params.search) {
      query = query.or(`email.ilike.%${params.search}%,firstName.ilike.%${params.search}%,lastName.ilike.%${params.search}%`);
    }

    if (params.isActive !== undefined) {
      query = query.eq('isActive', params.isActive);
    }

    // Apply sorting
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(skip, skip + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      throw new Error(error.message || 'Failed to fetch users');
    }

    // For each user, get their roles and project access
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
    return this.getUserWithDetails(userId);
  }

  async createUser(userData: CreateUserRequest): Promise<UserWithDetails> {
    // Multi-tenant: Get organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Check if email already exists (within organization)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .eq('organizationid', organizationId) // Check within organization
      .single();

    if (existingUser) {
      throw new Error('User with this email already exists in your organization');
    }

    // Get current user for createdBy
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    
    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    // Create user in Supabase Auth using Edge Function (Admin API)
    // Get session token for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const edgeFunctionUrl = `${config.SUPABASE_URL}/functions/v1/user-management`;
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

    const edgeFunctionData = await response.json();

    // Handle HTTP errors
    if (!response.ok) {
      const errorMessage = edgeFunctionData?.error || `HTTP ${response.status}: ${response.statusText}`;
      const errorDetails = edgeFunctionData?.details ? ` - ${edgeFunctionData.details}` : '';
      throw new Error(`Failed to create auth user: ${errorMessage}${errorDetails}`);
    }

    // Check if response contains an error
    if (edgeFunctionData && 'error' in edgeFunctionData) {
      throw new Error(`Failed to create auth user: ${edgeFunctionData.error}${edgeFunctionData.details ? ` - ${edgeFunctionData.details}` : ''}`);
    }

    if (!edgeFunctionData?.success || !edgeFunctionData?.authUserId) {
      throw new Error('Failed to create auth user: Invalid response from edge function');
    }

    const authUserId = edgeFunctionData.authUserId;

    const now = new Date().toISOString();
    
    // Create profile record linked to the auth user
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

    if (userError || !newUser) {
      // If profile creation fails, clean up the auth user via edge function
      try {
        const { data: { session: cleanupSession } } = await supabase.auth.getSession();
        if (cleanupSession) {
          const cleanupUrl = `${config.SUPABASE_URL}/functions/v1/user-management`;
          await fetch(cleanupUrl, {
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
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user after profile creation failure:', cleanupError);
      }
      throw new Error(userError?.message || 'Failed to create user profile');
    }

    // Assign roles if provided
    if (userData.roleAssignments && userData.roleAssignments.length > 0) {
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

      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(roleInserts);

      if (rolesError) {
        // Rollback user creation
        await supabase.from('users').delete().eq('id', newUser.id);
        throw new Error(rolesError.message || 'Failed to assign roles');
      }
    }

    return this.getUserWithDetails(newUser.id);
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<UserWithDetails> {
    // Multi-tenant: Verify ownership first
    const organizationId = await this.getCurrentUserOrganizationId();
    
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

    if (userData.firstName) updateData.firstName = userData.firstName;
    if (userData.lastName) updateData.lastName = userData.lastName;
    if (userData.isActive !== undefined) updateData.isActive = userData.isActive;

    // Multi-tenant: Ensure ownership
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .eq('organizationid', organizationId); // Ensure ownership

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update user');
    }

    // Update role assignments if provided
    if (userData.roleAssignments && userData.roleAssignments.length > 0) {
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

      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(roleInserts);

      if (rolesError) {
        throw new Error(rolesError.message || 'Failed to update role assignments');
      }
    }

    return this.getUserWithDetails(userId);
  }

  async deleteUser(userId: string): Promise<void> {
    // Multi-tenant: Verify ownership first
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    // Prevent self-deletion
    if (userId === userProfile.id) {
      throw new Error('Cannot delete your own account');
    }
    
    // Verify user belongs to same organization
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, organizationid')
      .eq('id', userId)
      .eq('organizationid', organizationId)
      .single();

    if (userError || !targetUser) {
      throw new Error('User not found or access denied');
    }

    const now = new Date().toISOString();

    // Soft delete user and related data in parallel
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

    if (userUpdate.error) {
      throw new Error(userUpdate.error.message || 'Failed to delete user');
    }

    if (rolesUpdate.error) {
      console.warn('Failed to deactivate user roles:', rolesUpdate.error);
    }

    if (accessUpdate.error) {
      console.warn('Failed to deactivate project access:', accessUpdate.error);
    }

    if (permissionsDelete.error) {
      console.warn('Failed to delete user permissions:', permissionsDelete.error);
    }

    // Delete user from Supabase Auth using Edge Function (Admin API)
    const { data: deletedTargetUser } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('id', userId)
      .single();

    if (deletedTargetUser?.auth_user_id) {
      try {
        // Get session token for authorization
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('Failed to delete auth user: Not authenticated');
          return;
        }

        const deleteUrl = `${config.SUPABASE_URL}/functions/v1/user-management`;
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

        const deleteData = await deleteResponse.json();

        // Handle errors
        if (!deleteResponse.ok || (deleteData && 'error' in deleteData)) {
          const errorMessage = deleteData?.error || `HTTP ${deleteResponse.status}: ${deleteResponse.statusText}`;
          const errorDetails = deleteData?.details ? ` - ${deleteData.details}` : '';
          console.warn('Failed to delete auth user:', errorMessage, errorDetails);
          // Don't throw - profile is already soft deleted
        }
      } catch (error) {
        console.warn('Failed to delete auth user:', error instanceof Error ? error.message : String(error));
        // Don't throw - profile is already soft deleted
      }
    }
  }

  async getAvailableRoles(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    level: number;
    isActive: boolean;
  }>> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('isActive', true)
      .eq('organizationid', organizationId) // Filter by organization
      .order('level', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to fetch roles');
    }

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

