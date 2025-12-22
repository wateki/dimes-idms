import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import type { Permission } from './userManagementService';
import { supabaseAuthService } from './supabaseAuthService';

type PermissionRow = Database['public']['Tables']['permissions']['Row'];
type RolePermission = Database['public']['Tables']['role_permissions']['Row'];
type UserPermission = Database['public']['Tables']['user_permissions']['Row'];

class SupabasePermissionsService {
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

  async getAllPermissions(params: { resource?: string; scope?: string; action?: string } = {}): Promise<Permission[]> {
    // Multi-tenant: Filter by organizationId
    const organizationId = await this.getCurrentUserOrganizationId();
    
    let query = supabase
      .from('permissions')
      .select('*')
      .eq('isActive', true)
      .eq('organizationid', organizationId); // Filter by organization

    if (params.resource) {
      query = query.eq('resource', params.resource);
    }
    if (params.scope) {
      query = query.eq('scope', params.scope);
    }
    if (params.action) {
      query = query.eq('action', params.action);
    }

    const { data, error } = await query
      .order('resource', { ascending: true })
      .order('action', { ascending: true })
      .order('scope', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to fetch permissions');
    }

    // Convert null to undefined for description and map to Permission interface
    return (data || []).map((perm: PermissionRow): Permission => ({
      id: perm.id,
      name: perm.name,
      description: perm.description ?? undefined,
      resource: perm.resource,
      action: perm.action,
      scope: perm.scope,
      isActive: perm.isActive,
    }));
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    // Multi-tenant: Verify role belongs to user's organization
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Verify role belongs to organization
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
      .select(`
        permission:permissions(*)
      `)
      .eq('roleId', roleId)
      .eq('isActive', true);

    if (error) {
      throw new Error(error.message || 'Failed to fetch role permissions');
    }

    // Extract permissions from the nested structure and convert null to undefined for description
    return (data || [])
      .map((rp: any) => rp.permission)
      .filter(Boolean)
      .map((perm: any) => ({
        ...perm,
        description: perm.description ?? undefined,
      }));
  }

  async assignRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    // Multi-tenant: Verify ownership
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Verify role exists and belongs to organization
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, organizationid')
      .eq('id', roleId)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (roleError || !role) {
      throw new Error('Role not found or access denied');
    }

    // Verify permissions exist and belong to organization
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('id')
      .in('id', permissionIds)
      .eq('isActive', true)
      .eq('organizationid', organizationId); // Filter by organization

    if (permError) {
      throw new Error(permError.message || 'Failed to verify permissions');
    }

    if (!permissions || permissions.length !== permissionIds.length) {
      throw new Error('One or more permissions not found');
    }

    // Create role permission assignments
    const now = new Date().toISOString();
    const rolePermissions = permissionIds.map(permissionId => ({
      id: crypto.randomUUID(),
      roleId,
      permissionId,
      isActive: true,
      updatedAt: now,
    } as unknown as Database['public']['Tables']['role_permissions']['Insert']));

    const { error } = await supabase
      .from('role_permissions')
      .upsert(rolePermissions, {
        onConflict: 'roleId,permissionId',
        ignoreDuplicates: false,
      });

    if (error) {
      throw new Error(error.message || 'Failed to assign role permissions');
    }
  }

  async removeRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .update({ isActive: false })
      .eq('roleId', roleId)
      .in('permissionId', permissionIds);

    if (error) {
      throw new Error(error.message || 'Failed to remove role permissions');
    }
  }
}

export const supabasePermissionsService = new SupabasePermissionsService();

