import { supabasePermissionsService } from './supabasePermissionsService';
import type { Permission } from './userManagementService';

class PermissionsService {
  async getAllPermissions(params: { resource?: string; scope?: string; action?: string } = {}): Promise<Permission[]> {
    return supabasePermissionsService.getAllPermissions(params);
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    return supabasePermissionsService.getRolePermissions(roleId);
  }

  async assignRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    return supabasePermissionsService.assignRolePermissions(roleId, permissionIds);
  }

  async removeRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    return supabasePermissionsService.removeRolePermissions(roleId, permissionIds);
  }
}

export const permissionsService = new PermissionsService();


