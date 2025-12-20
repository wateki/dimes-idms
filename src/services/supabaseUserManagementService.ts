import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';

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
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Get user roles with role details
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        *,
        role:roles(*),
        project:projects(id, name)
      `)
      .eq('userId', userId);

    if (rolesError) {
      throw new Error(rolesError.message || 'Failed to fetch user roles');
    }

    // Get project access
    const { data: projectAccess, error: accessError } = await supabase
      .from('user_project_access')
      .select(`
        *,
        project:projects(id, name)
      `)
      .eq('userId', userId);

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
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

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
        // Get user roles
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select(`
            *,
            role:roles(*),
            project:projects(id, name)
          `)
          .eq('userId', user.id);

        // Get project access
        const { data: projectAccess } = await supabase
          .from('user_project_access')
          .select(`
            *,
            project:projects(id, name)
          `)
          .eq('userId', user.id);

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
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Get current user for createdBy
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Create user in Supabase Auth first
    // Note: This requires admin API, so we'll need to handle this differently
    // For now, we'll create the profile record and assume auth user is created separately
    const now = new Date().toISOString();
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: '', // Not used with Supabase Auth
        isActive: true,
        createdBy: userProfile.id,
        updatedBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      } as Database['public']['Tables']['users']['Insert'])
      .select()
      .single();

    if (userError || !newUser) {
      throw new Error(userError?.message || 'Failed to create user');
    }

    // Assign roles if provided
    if (userData.roleAssignments && userData.roleAssignments.length > 0) {
      const roleInserts = userData.roleAssignments.map(assignment => ({
        userId: newUser.id,
        roleId: assignment.roleId,
        projectId: assignment.projectId || null,
        country: assignment.country || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as Database['public']['Tables']['user_roles']['Insert']));

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
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const updateData: any = {
      updatedBy: userProfile.id,
      updatedAt: new Date().toISOString(),
    };

    if (userData.firstName) updateData.firstName = userData.firstName;
    if (userData.lastName) updateData.lastName = userData.lastName;
    if (userData.isActive !== undefined) updateData.isActive = userData.isActive;

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update user');
    }

    // Update role assignments if provided
    if (userData.roleAssignments && userData.roleAssignments.length > 0) {
      // Remove existing role assignments
      await supabase
        .from('user_roles')
        .delete()
        .eq('userId', userId);

      // Add new role assignments
      const now = new Date().toISOString();
      const roleInserts = userData.roleAssignments.map(assignment => ({
        userId,
        roleId: assignment.roleId,
        projectId: assignment.projectId || null,
        country: assignment.country || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as Database['public']['Tables']['user_roles']['Insert']));

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
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Soft delete
    const { error } = await supabase
      .from('users')
      .update({
        isActive: false,
        updatedBy: userProfile.id,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to delete user');
    }
  }

  async getAvailableRoles(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    level: number;
    isActive: boolean;
  }>> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('isActive', true)
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
    // Check if role name already exists
    const { data: existing } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleData.name)
      .single();

    if (existing) {
      throw new Error('Role with this name already exists');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('roles')
      .insert({
        name: roleData.name,
        description: roleData.description || null,
        level: roleData.level,
        isActive: roleData.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      } as Database['public']['Tables']['roles']['Insert'])
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create role');
    }

    // Assign permissions if provided
    if (roleData.permissions && roleData.permissions.length > 0) {
      const permissionInserts = roleData.permissions.map(permissionId => ({
        roleId: data.id,
        permissionId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as Database['public']['Tables']['role_permissions']['Insert']));

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
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (roleData.name !== undefined) updateData.name = roleData.name;
    if (roleData.description !== undefined) updateData.description = roleData.description || null;
    if (roleData.level !== undefined) updateData.level = roleData.level;
    if (roleData.isActive !== undefined) updateData.isActive = roleData.isActive;

    const { data, error } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update role');
    }

    return formatRole(data);
  }

  async deleteRole(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('roles')
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq('id', roleId);

    if (error) {
      throw new Error(error.message || 'Failed to delete role');
    }
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
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
    // Get users with access to this project
    const { data: projectAccess, error: accessError } = await supabase
      .from('user_project_access')
      .select('userId')
      .eq('projectId', projectId)
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

    // Get users with filters
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .in('id', userIds);

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
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('user_project_access')
      .upsert({
        userId,
        projectId,
        accessLevel,
        isActive: true,
        updatedAt: now,
      } as Database['public']['Tables']['user_project_access']['Insert'], {
        onConflict: 'userId,projectId',
      });

    if (error) {
      throw new Error(error.message || 'Failed to update project access level');
    }
  }

  async removeUserFromProject(projectId: string, userId: string): Promise<void> {
    // Remove project access
    await supabase
      .from('user_project_access')
      .delete()
      .eq('userId', userId)
      .eq('projectId', projectId);

    // Remove project-specific roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('userId', userId)
      .eq('projectId', projectId);
  }
}

export const supabaseUserManagementService = new SupabaseUserManagementService();

