import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';
import { supabaseUsageTrackingService } from './supabaseUsageTrackingService';

type ProjectKoboTable = Database['public']['Tables']['project_kobo_tables']['Row'];
type KoboKpiMapping = Database['public']['Tables']['kobo_kpi_mappings']['Row'];

export interface ProjectKoboTableWithMappings extends ProjectKoboTable {
  kpiMappings: Array<KoboKpiMapping & {
    kpi: {
      id: string;
      name: string;
      unit?: string;
    };
    projectKoboTable: {
      id: string;
      tableName: string;
      displayName: string;
    };
  }>;
}

export interface KoboKpiMappingWithDetails extends KoboKpiMapping {
  kpi: {
    id: string;
    name: string;
    unit?: string;
  };
  projectKoboTable: {
    id: string;
    tableName: string;
    displayName: string;
  };
}

export interface AvailableKoboTable {
  id: number;
  asset_uid: string;
  table_name: string;
  asset_name: string;
  project: string;
  created_at: string;
  updated_at: string;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  maxLength: number | null;
}

export interface TableStats {
  totalCount: number;
  hasData: boolean;
  tableName: string;
  error?: string;
}

export interface KoboTableData {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  tableInfo: {
    id: string;
    tableName: string;
    displayName: string;
    description?: string;
  };
}

export interface KpiCalculationResult {
  kpiId: string;
  kpiName: string;
  results: Array<{
    mappingId: string;
    columnName: string;
    aggregationMethod: string;
    value: number;
    tableName: string;
    error?: string;
  }>;
  calculatedAt: string;
}

class SupabaseKoboDataService {
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

  /**
   * Verify project belongs to user's organization
   */
  private async verifyProjectOwnership(projectId: string): Promise<void> {
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('projects')
      .select('id, organizationid')
      .eq('id', projectId)
      .eq('organizationid', organizationId)
      .single();

    if (error || !data) {
      throw new Error('Project not found or access denied');
    }
  }

  // Available Kobo Tables - query from kobo_asset_tracking table
  async getAvailableKoboTables(projectId: string): Promise<{ data: AvailableKoboTable[] }> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    // Query the kobo_asset_tracking table (if it exists in Supabase)
    // Note: This table might be in a different schema or need to be created
    const { data, error } = await supabase
      .from('kobo_asset_tracking')
      .select('*')
      .order('asset_name', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return { data: [] };
      }
      throw new Error(error.message || 'Failed to fetch available Kobo tables');
    }

    // Filter out tables already assigned to this project (filtered by organization)
    const organizationId = await this.getCurrentUserOrganizationId();
    const { data: assignedTables } = await supabase
      .from('project_kobo_tables')
      .select('tableName')
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Filter by organization

    const assignedTableNames = (assignedTables || []).map(t => t.tableName);
    const koboData = (data || []) as unknown as AvailableKoboTable[];
    const filtered = koboData.filter((table) => 
      !assignedTableNames.includes(table.table_name)
    );

    return { data: filtered };
  }

  // Project Kobo Table Management
  async createProjectKoboTable(projectId: string, data: {
    tableName: string;
    displayName: string;
    description?: string;
    isActive?: boolean;
  }) {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    // Check if table already exists for this project (within organization)
    const { data: existing } = await supabase
      .from('project_kobo_tables')
      .select('id')
      .eq('projectId', projectId)
      .eq('tableName', data.tableName)
      .eq('organizationid', userProfile.organizationId) // Check within organization
      .single();

    if (existing) {
      throw new Error('Table already assigned to this project');
    }

    const now = new Date().toISOString();
    const { data: newTable, error } = await supabase
      .from('project_kobo_tables')
      .insert({
        id: crypto.randomUUID(),
        projectId,
        tableName: data.tableName,
        displayName: data.displayName,
        description: data.description || null,
        isActive: data.isActive ?? true,
        organizationId: userProfile.organizationId, // Multi-tenant: Set organizationId
        createdBy: userProfile.id,
        updatedBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      } as Database['public']['Tables']['project_kobo_tables']['Insert'])
      .select()
      .single();

    if (error || !newTable) {
      throw new Error(error?.message || 'Failed to create project Kobo table');
    }

    // Note: Usage tracking is now handled by database trigger (track_kobo_table_insert)
    // This ensures atomicity and better performance

    return { data: newTable };
  }

  async getProjectKoboTables(projectId: string): Promise<{ data: Array<{
    id: string;
    tableName: string;
    displayName: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    kpiMappings: Array<KoboKpiMapping & {
      kpi: {
        id: string;
        name: string;
        unit?: string;
      };
      projectKoboTable: {
        id: string;
        tableName: string;
        displayName: string;
      };
    }>;
  }> }> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('project_kobo_tables')
      .select(`
        *,
        kpiMappings:kobo_kpi_mappings(
          *,
          kpi:kpis(id, name, unit),
          projectKoboTable:project_kobo_tables(id, tableName, displayName)
        )
      `)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId) // Filter by organization
      .eq('isActive', true)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch project Kobo tables');
    }

    // Map to convert null to undefined for description
    return {
      data: (data || []).map(table => ({
        ...table,
        description: table.description ?? undefined,
        kpiMappings: (table as any).kpiMappings || [],
      })) as Array<{
        id: string;
        tableName: string;
        displayName: string;
        description?: string;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
        kpiMappings: Array<KoboKpiMapping & {
          kpi: {
            id: string;
            name: string;
            unit?: string;
          };
          projectKoboTable: {
            id: string;
            tableName: string;
            displayName: string;
          };
        }>;
      }>,
    };
  }

  async getProjectKoboTable(projectId: string, tableId: string): Promise<{ data: ProjectKoboTableWithMappings }> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    const { data, error } = await supabase
      .from('project_kobo_tables')
      .select(`
        *,
        kpiMappings:kobo_kpi_mappings(
          *,
          kpi:kpis(id, name, unit),
          projectKoboTable:project_kobo_tables(id, tableName, displayName)
        )
      `)
      .eq('id', tableId)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Kobo table not found or access denied');
    }

    return { data: data as ProjectKoboTableWithMappings };
  }

  async updateProjectKoboTable(
    projectId: string,
    tableId: string,
    data: Partial<{
      displayName: string;
      description: string;
      isActive: boolean;
    }>
  ) {
    // Multi-tenant: Verify ownership (getProjectKoboTable already verifies)
    await this.getProjectKoboTable(projectId, tableId);
    
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

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Multi-tenant: Ensure ownership
    const { data: updated, error } = await supabase
      .from('project_kobo_tables')
      .update(updateData)
      .eq('id', tableId)
      .eq('projectId', projectId)
      .eq('organizationid', userProfile.organizationId) // Ensure ownership
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update project Kobo table');
    }

    return { data: updated };
  }

  async deleteProjectKoboTable(projectId: string, tableId: string) {
    // Multi-tenant: Verify ownership (getProjectKoboTable already verifies)
    await this.getProjectKoboTable(projectId, tableId);
    
    const organizationId = await this.getCurrentUserOrganizationId();

    // Delete all KPI mappings first (filtered by organization)
    await supabase
      .from('kobo_kpi_mappings')
      .delete()
      .eq('projectKoboTableId', tableId)
      .eq('organizationid', organizationId); // Filter by organization

    // Delete the table (ensure ownership)
    const { error } = await supabase
      .from('project_kobo_tables')
      .delete()
      .eq('id', tableId)
      .eq('projectId', projectId)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) {
      throw new Error(error.message || 'Failed to delete project Kobo table');
    }

    // Note: Usage tracking is now handled by database trigger (track_kobo_table_delete)
    // This ensures atomicity and better performance
  }

  // Kobo KPI Mapping Management
  async createKoboKpiMapping(projectId: string, data: {
    projectKoboTableId: string;
    kpiId: string;
    columnName: string;
    aggregationMethod: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'DISTINCT_COUNT';
    timeFilterField?: string;
    timeFilterValue?: number;
    isActive?: boolean;
  }) {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }
    
    // Verify table belongs to project and organization
    const { data: table, error: tableError } = await supabase
      .from('project_kobo_tables')
      .select('id, projectId, organizationid')
      .eq('id', data.projectKoboTableId)
      .eq('projectId', projectId)
      .eq('organizationid', userProfile.organizationId)
      .single();

    if (tableError || !table) {
      throw new Error('Kobo table not found or access denied');
    }
    
    // Verify KPI belongs to project and organization
    const { data: kpi, error: kpiError } = await supabase
      .from('kpis')
      .select('id, projectId, organizationid')
      .eq('id', data.kpiId)
      .eq('projectId', projectId)
      .eq('organizationid', userProfile.organizationId)
      .single();

    if (kpiError || !kpi) {
      throw new Error('KPI not found or access denied');
    }

    // Check if mapping already exists (within organization)
    const { data: existing } = await supabase
      .from('kobo_kpi_mappings')
      .select('id')
      .eq('projectKoboTableId', data.projectKoboTableId)
      .eq('kpiId', data.kpiId)
      .eq('columnName', data.columnName)
      .eq('organizationid', userProfile.organizationId) // Check within organization
      .single();

    if (existing) {
      throw new Error('Mapping already exists for this KPI and column');
    }

    const now = new Date().toISOString();
    const { data: mapping, error } = await supabase
      .from('kobo_kpi_mappings')
      .insert({
        id: crypto.randomUUID(),
        projectKoboTableId: data.projectKoboTableId,
        kpiId: data.kpiId,
        columnName: data.columnName,
        aggregationMethod: data.aggregationMethod,
        timeFilterField: data.timeFilterField || null,
        timeFilterValue: data.timeFilterValue || null,
        isActive: data.isActive ?? true,
        organizationId: userProfile.organizationId, // Multi-tenant: Set organizationId
        createdBy: userProfile.id,
        updatedBy: userProfile.id,
        createdAt: now,
        updatedAt: now,
      } as unknown as Database['public']['Tables']['kobo_kpi_mappings']['Insert'])
      .select(`
        *,
        kpi:kpis(id, name, unit),
        projectKoboTable:project_kobo_tables(id, tableName, displayName)
      `)
      .single();

    if (error || !mapping) {
      throw new Error(error?.message || 'Failed to create Kobo KPI mapping');
    }

    return { data: mapping as KoboKpiMappingWithDetails };
  }

  async getKoboKpiMappings(projectId: string, tableId?: string): Promise<{ data: KoboKpiMappingWithDetails[] }> {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    let query = supabase
      .from('kobo_kpi_mappings')
      .select(`
        *,
        kpi:kpis(id, name, unit),
        projectKoboTable:project_kobo_tables!kobo_kpi_mappings_projectKoboTableId_fkey(id, tableName, displayName)
      `)
      .eq('isActive', true)
      .eq('organizationid', organizationId); // Filter by organization

    if (tableId) {
      query = query.eq('projectKoboTableId', tableId);
    } else {
      // Filter by project through the table relationship (filtered by organization)
      const { data: tables } = await supabase
        .from('project_kobo_tables')
        .select('id')
        .eq('projectId', projectId)
        .eq('organizationid', organizationId); // Filter by organization

      if (tables && tables.length > 0) {
        query = query.in('projectKoboTableId', tables.map(t => t.id));
      } else {
        return { data: [] };
      }
    }

    const { data, error } = await query.order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch Kobo KPI mappings');
    }

    return { data: (data || []) as KoboKpiMappingWithDetails[] };
  }

  async updateKoboKpiMapping(
    projectId: string,
    mappingId: string,
    data: Partial<{
      columnName: string;
      aggregationMethod: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'DISTINCT_COUNT';
      timeFilterField: string;
      timeFilterValue: number;
      isActive: boolean;
    }>
  ) {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile || !userProfile.organizationId) {
      throw new Error('User profile not found or user is not associated with an organization');
    }

    // Verify the mapping belongs to the project and organization
    const { data: mapping, error: mappingError } = await supabase
      .from('kobo_kpi_mappings')
      .select(`
        *,
        projectKoboTable:project_kobo_tables!kobo_kpi_mappings_projectKoboTableId_fkey(projectId, organizationId)
      `)
      .eq('id', mappingId)
      .eq('organizationid', userProfile.organizationId) // Ensure ownership
      .single();

    if (mappingError || !mapping || (mapping as any).projectKoboTable?.projectId !== projectId) {
      throw new Error('Kobo KPI mapping not found or access denied');
    }

    const updateData: any = {
      updatedBy: userProfile.id,
      updatedAt: new Date().toISOString(),
    };

    if (data.columnName !== undefined) updateData.columnName = data.columnName;
    if (data.aggregationMethod !== undefined) updateData.aggregationMethod = data.aggregationMethod;
    if (data.timeFilterField !== undefined) updateData.timeFilterField = data.timeFilterField || null;
    if (data.timeFilterValue !== undefined) updateData.timeFilterValue = data.timeFilterValue || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Multi-tenant: Ensure ownership
    const { data: updated, error } = await supabase
      .from('kobo_kpi_mappings')
      .update(updateData)
      .eq('id', mappingId)
      .eq('organizationid', userProfile.organizationId) // Ensure ownership
      .select(`
        *,
        kpi:kpis(id, name, unit),
        projectKoboTable:project_kobo_tables(id, tableName, displayName)
      `)
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update Kobo KPI mapping');
    }

    return { data: updated as KoboKpiMappingWithDetails };
  }

  async deleteKoboKpiMapping(projectId: string, mappingId: string) {
    // Multi-tenant: Verify project ownership first
    await this.verifyProjectOwnership(projectId);
    
    const organizationId = await this.getCurrentUserOrganizationId();
    
    // Verify the mapping belongs to the project and organization
    const { data: mapping, error: mappingError } = await supabase
      .from('kobo_kpi_mappings')
      .select(`
        *,
        projectKoboTable:project_kobo_tables!kobo_kpi_mappings_projectKoboTableId_fkey(projectId, organizationId)
      `)
      .eq('id', mappingId)
      .eq('organizationid', organizationId) // Ensure ownership
      .single();

    if (mappingError || !mapping || (mapping as any).projectKoboTable?.projectId !== projectId) {
      throw new Error('Kobo KPI mapping not found or access denied');
    }

    // Multi-tenant: Ensure ownership
    const { error } = await supabase
      .from('kobo_kpi_mappings')
      .delete()
      .eq('id', mappingId)
      .eq('organizationid', organizationId); // Ensure ownership

    if (error) {
      throw new Error(error.message || 'Failed to delete Kobo KPI mapping');
    }
  }

  // Get table columns using Supabase RPC or direct query
  async getTableColumns(projectId: string, tableId: string): Promise<{ data: TableColumn[] }> {
    const table = await this.getProjectKoboTable(projectId, tableId);
    const tableName = table.data.tableName;

    // Use Supabase RPC to get column information
    // Note: This requires a database function to be created
    // For now, we'll use a direct query to information_schema
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: tableName,
    });

    if (error) {
      // Fallback: try direct query if RPC doesn't exist
      // This might require enabling RLS or using a service role
      throw new Error(error.message || 'Failed to fetch table columns. RPC function may need to be created.');
    }

    return { data: (data || []) as TableColumn[] };
  }

  // Get table statistics using Supabase RPC
  async getTableStats(projectId: string, tableId: string): Promise<{ data: TableStats }> {
    const table = await this.getProjectKoboTable(projectId, tableId);
    const tableName = table.data.tableName;

    // Use Supabase RPC to get table stats
    const { data, error } = await supabase.rpc('get_table_stats', {
      table_name: tableName,
    });

    if (error) {
      return {
        data: {
          totalCount: 0,
          hasData: false,
          tableName,
          error: error.message,
        },
      };
    }

    return { data: data as TableStats };
  }

  // Kobo Data Fetching using Supabase RPC
  async getKoboTableData(
    projectId: string,
    tableId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: KoboTableData }> {
    const table = await this.getProjectKoboTable(projectId, tableId);
    const tableName = table.data.tableName;
    const offset = (page - 1) * limit;

    // Use Supabase RPC to fetch paginated data from dynamic table
    const { data: tableData, error: dataError } = await supabase.rpc('get_kobo_table_data', {
      table_name: tableName,
      page_limit: limit,
      page_offset: offset,
    });

    const { data: countData, error: countError } = await supabase.rpc('get_kobo_table_count', {
      table_name: tableName,
    });

    if (dataError || countError) {
      throw new Error(dataError?.message || countError?.message || 'Failed to fetch table data');
    }

    const total = countData as number || 0;

    return {
      data: {
        data: (tableData || []) as any[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        tableInfo: {
          id: table.data.id,
          tableName: table.data.tableName,
          displayName: table.data.displayName,
          description: table.data.description || undefined,
        },
      },
    };
  }

  // KPI Calculation using Supabase RPC
  async calculateKpiFromKoboData(projectId: string, kpiId: string): Promise<{ data: KpiCalculationResult }> {
    // Get KPI mappings for this KPI
    const { data: mappings } = await this.getKoboKpiMappings(projectId);

    const kpiMappings = mappings.data.filter(m => m.kpiId === kpiId);

    if (kpiMappings.length === 0) {
      throw new Error('No KPI mappings found for this KPI');
    }

    // Get KPI details
    const { data: kpi } = await supabase
      .from('kpis')
      .select('id, name')
      .eq('id', kpiId)
      .eq('projectId', projectId)
      .single();

    if (!kpi) {
      throw new Error('KPI not found');
    }

    // Calculate KPI using RPC function
    const { data: result, error } = await supabase.rpc('calculate_kpi_from_kobo', {
      kpi_id: kpiId,
      mapping_ids: kpiMappings.map(m => m.id),
    });

    if (error) {
      throw new Error(error.message || 'Failed to calculate KPI');
    }

    return {
      data: {
        kpiId: kpi.id,
        kpiName: kpi.name,
        results: (result?.results || []) as KpiCalculationResult['results'],
        calculatedAt: new Date().toISOString(),
      },
    };
  }
}

export const supabaseKoboDataService = new SupabaseKoboDataService();

