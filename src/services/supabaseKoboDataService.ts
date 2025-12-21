import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import { supabaseAuthService } from './supabaseAuthService';

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
  // Available Kobo Tables - query from kobo_asset_tracking table
  async getAvailableKoboTables(projectId: string): Promise<{ data: AvailableKoboTable[] }> {
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

    // Filter out tables already assigned to this project
    const { data: assignedTables } = await supabase
      .from('project_kobo_tables')
      .select('tableName')
      .eq('projectId', projectId);

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
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Check if table already exists for this project
    const { data: existing } = await supabase
      .from('project_kobo_tables')
      .select('id')
      .eq('projectId', projectId)
      .eq('tableName', data.tableName)
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
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Kobo table not found');
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
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Verify table exists
    await this.getProjectKoboTable(projectId, tableId);

    const updateData: any = {
      updatedBy: userProfile.id,
      updatedAt: new Date().toISOString(),
    };

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const { data: updated, error } = await supabase
      .from('project_kobo_tables')
      .update(updateData)
      .eq('id', tableId)
      .eq('projectId', projectId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update project Kobo table');
    }

    return { data: updated };
  }

  async deleteProjectKoboTable(projectId: string, tableId: string) {
    // Verify table exists
    await this.getProjectKoboTable(projectId, tableId);

    // Delete all KPI mappings first
    await supabase
      .from('kobo_kpi_mappings')
      .delete()
      .eq('projectKoboTableId', tableId);

    // Delete the table
    const { error } = await supabase
      .from('project_kobo_tables')
      .delete()
      .eq('id', tableId)
      .eq('projectId', projectId);

    if (error) {
      throw new Error(error.message || 'Failed to delete project Kobo table');
    }
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
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Verify the Kobo table belongs to the project
    const { data: koboTable } = await supabase
      .from('project_kobo_tables')
      .select('id')
      .eq('id', data.projectKoboTableId)
      .eq('projectId', projectId)
      .single();

    if (!koboTable) {
      throw new Error('Kobo table not found for this project');
    }

    // Verify the KPI belongs to the project
    const { data: kpi } = await supabase
      .from('kpis')
      .select('id')
      .eq('id', data.kpiId)
      .eq('projectId', projectId)
      .single();

    if (!kpi) {
      throw new Error('KPI not found for this project');
    }

    // Check if mapping already exists
    const { data: existing } = await supabase
      .from('kobo_kpi_mappings')
      .select('id')
      .eq('projectKoboTableId', data.projectKoboTableId)
      .eq('kpiId', data.kpiId)
      .eq('columnName', data.columnName)
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
    let query = supabase
      .from('kobo_kpi_mappings')
      .select(`
        *,
        kpi:kpis(id, name, unit),
        projectKoboTable:project_kobo_tables!kobo_kpi_mappings_projectKoboTableId_fkey(id, tableName, displayName)
      `)
      .eq('isActive', true);

    if (tableId) {
      query = query.eq('projectKoboTableId', tableId);
    } else {
      // Filter by project through the table relationship
      const { data: tables } = await supabase
        .from('project_kobo_tables')
        .select('id')
        .eq('projectId', projectId);

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
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    const userProfile = await supabaseAuthService.getUserProfile(currentUser.id);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Verify the mapping belongs to the project
    const { data: mapping } = await supabase
      .from('kobo_kpi_mappings')
      .select(`
        *,
        projectKoboTable:project_kobo_tables!kobo_kpi_mappings_projectKoboTableId_fkey(projectId)
      `)
      .eq('id', mappingId)
      .single();

    if (!mapping || (mapping as any).projectKoboTable?.projectId !== projectId) {
      throw new Error('Kobo KPI mapping not found');
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

    const { data: updated, error } = await supabase
      .from('kobo_kpi_mappings')
      .update(updateData)
      .eq('id', mappingId)
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
    // Verify the mapping belongs to the project
    const { data: mapping } = await supabase
      .from('kobo_kpi_mappings')
      .select(`
        *,
        projectKoboTable:project_kobo_tables!kobo_kpi_mappings_projectKoboTableId_fkey(projectId)
      `)
      .eq('id', mappingId)
      .single();

    if (!mapping || (mapping as any).projectKoboTable?.projectId !== projectId) {
      throw new Error('Kobo KPI mapping not found');
    }

    const { error } = await supabase
      .from('kobo_kpi_mappings')
      .delete()
      .eq('id', mappingId);

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

