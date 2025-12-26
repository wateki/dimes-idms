import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Plus, Settings, Eye, BarChart3, Calendar, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createEnhancedPermissionManager } from '@/lib/permissions';
import { useNotification } from '@/hooks/useNotification';
import { KoboDataService, TableStats } from '@/services/koboDataService';
import { KoboTableViewer } from './kobo-data/KoboTableViewer';
import { KoboKpiMapping } from './kobo-data/KoboKpiMapping';
import { AssignKoboTableDialog } from './kobo-data/AssignKoboTableDialog';

interface ProjectKoboTable {
  id: string;
  tableName: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  kpiMappings: KoboKpiMapping[];
}

interface KoboKpiMapping {
  id: string;
  columnName: string;
  aggregationMethod: string;
  timeFilterField?: string;
  timeFilterValue?: number;
  isActive: boolean;
  kpi: {
    id: string;
    name: string;
    unit?: string;
  };
}

export function KoboData() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();
  const permissionManager = createEnhancedPermissionManager({ user, isAuthenticated, isLoading });
  const canRead = projectId ? (permissionManager.canAccessProjectComponent(projectId, 'kobo', 'read')) : false;
  const canUpdate = projectId ? (
    permissionManager.hasProjectPermission('kobo', 'update', projectId) ||
    permissionManager.hasResourcePermission('kobo', 'update', 'regional') ||
    permissionManager.hasResourcePermission('kobo', 'update', 'global')
  ) : false;
  const { showSuccess, showError } = useNotification();
  const [koboTables, setKoboTables] = useState<ProjectKoboTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<ProjectKoboTable | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [tableStats, setTableStats] = useState<Record<string, TableStats>>({});

  useEffect(() => {
    if (projectId) {
      loadKoboTables();
    }
  }, [projectId]);

  const loadKoboTables = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const response = await KoboDataService.getProjectKoboTables(projectId);
      const tables = response.data || [];
      setKoboTables(tables);

      // Fetch stats for each table
      const statsPromises = tables.map(async (table) => {
        try {
          const statsResponse = await KoboDataService.getTableStats(projectId, table.id);
          return { tableId: table.id, stats: statsResponse.data };
        } catch (error) {
          console.error(`Error loading stats for table ${table.id}:`, error);
          return { tableId: table.id, stats: { totalCount: 0, hasData: false, tableName: table.tableName, error: 'Failed to load stats' } };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap = statsResults.reduce((acc, { tableId, stats }) => {
        acc[tableId] = stats;
        return acc;
      }, {} as Record<string, TableStats>);

      setTableStats(statsMap);
    } catch (error) {
      console.error('Error loading Kobo tables:', error);
      showError('Failed to load Kobo tables');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTable = async (tableData: any) => {
    if (!projectId) return;
    
    try {
      await KoboDataService.createProjectKoboTable(projectId, tableData);
      showSuccess('Kobo table assigned successfully');
      setShowAssignDialog(false);
      loadKoboTables();
    } catch (error) {
      console.error('Error assigning Kobo table:', error);
      showError('Failed to assign Kobo table');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!projectId) return;
    
    try {
      await KoboDataService.deleteProjectKoboTable(projectId, tableId);
      showSuccess('Kobo table removed successfully');
      loadKoboTables();
      if (selectedTable?.id === tableId) {
        setSelectedTable(null);
      }
    } catch (error) {
      console.error('Error deleting Kobo table:', error);
      showError('Failed to remove Kobo table');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading Kobo data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kobo Data</h1>
          <p className="text-muted-foreground">
            View and manage archived Kobo form data for this project
          </p>
        </div>
        {canUpdate && (
          <Button onClick={() => setShowAssignDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Assign Table
          </Button>
        )}
      </div>

      {koboTables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Kobo Tables Assigned</h3>
            <p className="text-gray-500 text-center mb-4">
              No Kobo form tables have been assigned to this project yet.
            </p>
            {canUpdate && (
              <Button onClick={() => setShowAssignDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Your First Table
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="tables" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tables">Tables</TabsTrigger>
            {canUpdate && (
              <TabsTrigger value="kpi-mappings">KPI Mappings</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="tables" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {koboTables.map((table) => (
                <Card 
                  key={table.id} 
                  className={`cursor-pointer transition-colors min-w-0 ${
                    selectedTable?.id === table.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedTable(table)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight break-words flex-1 min-w-0">
                        {table.displayName}
                      </CardTitle>
                      <Badge variant={table.isActive ? 'default' : 'secondary'} className="flex-shrink-0">
                        {table.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground font-mono break-all mt-2">
                      {table.tableName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {table.description && (
                      <p className="text-sm text-gray-600 mb-3 break-words">{table.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span>{table.kpiMappings.length} KPI mappings</span>
                        {tableStats[table.id] && (
                          <span className="text-xs">
                            {tableStats[table.id].error ? (
                              <span className="text-red-500">Error loading count</span>
                            ) : (
                              `${tableStats[table.id].totalCount} records`
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTable(table);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTable(table.id);
                          }}
                        >
                          Delete
                        </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedTable && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    {selectedTable.displayName}
                  </CardTitle>
                  <CardDescription>
                    Viewing data from table: {selectedTable.tableName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <KoboTableViewer 
                    projectId={projectId!} 
                    tableId={selectedTable.id}
                    tableName={selectedTable.tableName}
                    displayName={selectedTable.displayName}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {canUpdate && (
            <TabsContent value="kpi-mappings" className="space-y-4">
              <KoboKpiMapping projectId={projectId!} />
            </TabsContent>
          )}
        </Tabs>
      )}

      {canUpdate && (
      <AssignKoboTableDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onAssign={handleAssignTable}
        projectId={projectId!}
      />
      )}
    </div>
  );
}

