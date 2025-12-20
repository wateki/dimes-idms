import { supabaseUserManagementService } from './supabaseUserManagementService';
import type {
  UserWithDetails as User,
  UsersResponse,
  CreateUserRequest,
  UpdateUserRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  QueryUsersParams as QueryUsersRequest,
} from './supabaseUserManagementService';

export interface UserRole {
  id: string;
  roleName: string;
  roleDescription?: string;
  level: number;
  projectId?: string;
  projectName?: string;
  country?: string;
  isActive: boolean;
}

export interface ProjectAccess {
  projectId: string;
  projectName: string;
  accessLevel: 'read' | 'write' | 'admin';
  isActive: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  level: number;
  isActive: boolean;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  scope: string;
  isActive: boolean;
}

export interface RoleAssignment {
  roleId: string;
  projectId?: string;
  country?: string;
}

// Re-export types for backwards compatibility
export type { User, UsersResponse, CreateUserRequest, UpdateUserRequest, CreateRoleRequest, UpdateRoleRequest, QueryUsersRequest };

class UserManagementService {

  // User CRUD operations
  async getUsers(params: QueryUsersRequest = {}): Promise<UsersResponse> {
    return supabaseUserManagementService.getUsers(params);
  }

  async getUserById(userId: string): Promise<User> {
    return supabaseUserManagementService.getUserById(userId);
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    return supabaseUserManagementService.createUser(userData);
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    return supabaseUserManagementService.updateUser(userId, userData);
  }

  async deleteUser(userId: string): Promise<void> {
    return supabaseUserManagementService.deleteUser(userId);
  }

  // Role management
  async getAvailableRoles(): Promise<Role[]> {
    return supabaseUserManagementService.getAvailableRoles();
  }

  async createRole(roleData: CreateRoleRequest): Promise<Role> {
    return supabaseUserManagementService.createRole(roleData);
  }

  async updateRole(roleId: string, roleData: UpdateRoleRequest): Promise<Role> {
    return supabaseUserManagementService.updateRole(roleId, roleData);
  }

  async deleteRole(roleId: string): Promise<void> {
    return supabaseUserManagementService.deleteRole(roleId);
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    return supabaseUserManagementService.getRolePermissions(roleId);
  }

  async getAvailableProjectRoles(): Promise<Role[]> {
    // For now, return all available roles (project roles are typically levels 4-6)
    return supabaseUserManagementService.getAvailableRoles();
  }

  // Project user management
  async getProjectUsers(projectId: string, params: QueryUsersRequest = {}): Promise<UsersResponse> {
    return supabaseUserManagementService.getProjectUsers(projectId, params);
  }

  async createProjectUser(projectId: string, userData: CreateUserRequest): Promise<User> {
    // Create user with project access
    const user = await supabaseUserManagementService.createUser(userData);
    
    // Add project access
    await supabaseUserManagementService.updateProjectAccessLevel(user.id, projectId, 'read');
    
    return user;
  }

  async updateProjectUser(projectId: string, userId: string, userData: UpdateUserRequest): Promise<User> {
    return supabaseUserManagementService.updateUser(userId, userData);
  }

  async removeUserFromProject(projectId: string, userId: string): Promise<void> {
    return supabaseUserManagementService.removeUserFromProject(projectId, userId);
  }

  // Utility methods
  async updateProjectAccessLevel(userId: string, projectId: string, accessLevel: 'read' | 'write' | 'admin'): Promise<void> {
    return supabaseUserManagementService.updateProjectAccessLevel(userId, projectId, accessLevel);
  }

}

export const userManagementService = new UserManagementService();
