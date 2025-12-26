import { supabaseKoboDataService } from './supabaseKoboDataService';
import type {
  ProjectKoboTableWithMappings,
  KoboKpiMappingWithDetails as KoboKpiMapping,
  AvailableKoboTable,
  TableColumn,
  TableStats,
  KoboTableData,
  KpiCalculationResult,
} from './supabaseKoboDataService';

// Re-export types for backwards compatibility
export type {
  ProjectKoboTableWithMappings as ProjectKoboTable,
  KoboKpiMapping,
  AvailableKoboTable,
  TableColumn,
  TableStats,
  KoboTableData,
  KpiCalculationResult,
};

export class KoboDataService {
  // Available Kobo Tables
  static async getAvailableKoboTables(projectId: string): Promise<{ data: AvailableKoboTable[] }> {
    return supabaseKoboDataService.getAvailableKoboTables(projectId);
  }

  // Project Kobo Table Management
  static async createProjectKoboTable(projectId: string, data: {
    tableName: string;
    displayName: string;
    description?: string;
    isActive?: boolean;
  }) {
    return supabaseKoboDataService.createProjectKoboTable(projectId, data);
  }

  static async getProjectKoboTables(projectId: string): Promise<{ data: ProjectKoboTableWithMappings[] }> {
    return supabaseKoboDataService.getProjectKoboTables(projectId);
  }

  static async getProjectKoboTable(projectId: string, tableId: string): Promise<{ data: ProjectKoboTableWithMappings }> {
    return supabaseKoboDataService.getProjectKoboTable(projectId, tableId);
  }

  static async updateProjectKoboTable(
    projectId: string, 
    tableId: string, 
    data: Partial<{
      displayName: string;
      description: string;
      isActive: boolean;
    }>
  ) {
    return supabaseKoboDataService.updateProjectKoboTable(projectId, tableId, data);
  }

  static async deleteProjectKoboTable(projectId: string, tableId: string) {
    return supabaseKoboDataService.deleteProjectKoboTable(projectId, tableId);
  }

  // Kobo KPI Mapping Management
  static async createKoboKpiMapping(projectId: string, data: {
    projectKoboTableId: string;
    kpiId: string;
    columnName: string;
    aggregationMethod: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'DISTINCT_COUNT';
    timeFilterField?: string;
    timeFilterValue?: number;
    isActive?: boolean;
  }) {
    return supabaseKoboDataService.createKoboKpiMapping(projectId, data);
  }

  static async getKoboKpiMappings(projectId: string, tableId?: string): Promise<{ data: KoboKpiMapping[] }> {
    return supabaseKoboDataService.getKoboKpiMappings(projectId, tableId);
  }

  static async updateKoboKpiMapping(
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
    return supabaseKoboDataService.updateKoboKpiMapping(projectId, mappingId, data);
  }

  static async deleteKoboKpiMapping(projectId: string, mappingId: string) {
    return supabaseKoboDataService.deleteKoboKpiMapping(projectId, mappingId);
  }

  // Get table columns
  static async getTableColumns(projectId: string, tableId: string): Promise<{ data: TableColumn[] }> {
    return supabaseKoboDataService.getTableColumns(projectId, tableId);
  }

  // Get table statistics
  static async getTableStats(projectId: string, tableId: string): Promise<{ data: TableStats }> {
    return supabaseKoboDataService.getTableStats(projectId, tableId);
  }

  // Kobo Data Fetching
  static async getKoboTableData(
    projectId: string, 
    tableId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<{ data: KoboTableData }> {
    return supabaseKoboDataService.getKoboTableData(projectId, tableId, page, limit);
  }

  // KPI Calculation
  static async calculateKpiFromKoboData(projectId: string, kpiId: string): Promise<{ data: KpiCalculationResult }> {
    return supabaseKoboDataService.calculateKpiFromKoboData(projectId, kpiId);
  }
}

