import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadialGauge } from '@/components/visualizations/RadialGauge';
import { StackedBarChart } from '@/components/visualizations/StackedBarChart';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { projectDataApi } from '@/lib/api/projectDataApi';
import { Outcome } from '@/types/dashboard';
import { Pencil } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export function KPIAnalytics() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { getProjectById, getProjectOutcomes, getProjectKPIs, dataRefreshTrigger, triggerDataRefresh } = useProjects();
  const [selectedOutcome, setSelectedOutcome] = useState<string | undefined>(undefined);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [allKPIs, setAllKPIs] = useState<any[]>([]);
  const [editingOutcome, setEditingOutcome] = useState<Outcome | null>(null);
  const [editingKpi, setEditingKpi] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;
  if (!projectId) {
    return <div>No project selected</div>;
  }

  // Get project details for title
  const project = getProjectById(projectId);
  const projectName = project?.name || projectId.toUpperCase();

  // Load project data
  useEffect(() => {
    const loadData = async () => {
      if (projectId && user) {
        try {
          console.log(`🔄 KPIAnalytics: Loading data for project ${projectId} (refresh trigger: ${dataRefreshTrigger})`);
          const [outcomesData, kpisData] = await Promise.all([
            getProjectOutcomes(projectId),
            getProjectKPIs(projectId)
          ]);
          setOutcomes(outcomesData);
          setAllKPIs(kpisData);
          console.log(`✅ KPIAnalytics: Loaded ${outcomesData.length} outcomes, ${kpisData.length} KPIs with calculated values`);
        } catch (error) {
          console.error('Error loading KPI data:', error);
        }
      }
    };

    loadData();
  }, [projectId, user, getProjectOutcomes, getProjectKPIs, dataRefreshTrigger]);

  // Filter KPIs by selected outcome if one is selected  
  const filteredKPIs = selectedOutcome
    ? allKPIs.filter((kpi: any) => kpi.outcomeId === selectedOutcome)
    : allKPIs;

  // Check if current project has KPI data available
  if (!allKPIs || allKPIs.length === 0) {
    return (
      <div className="flex flex-col space-y-8 overflow-x-hidden w-full">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{projectName} KPI Analytics</h1>
          <p className="text-muted-foreground">
            No KPI data available for {projectName} project.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>KPI data is not available for this project yet.</p>
             
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group KPIs by outcome
  const groupedKPIs: Record<string, any[]> = {};
  filteredKPIs.forEach((kpi: any) => {
    if (!groupedKPIs[kpi.outcomeId]) {
      groupedKPIs[kpi.outcomeId] = [];
    }
    groupedKPIs[kpi.outcomeId].push(kpi);
  });

  const handleSaveOutcome = async () => {
    if (!projectId || !editingOutcome) return;
    setIsSaving(true);
    try {
      await projectDataApi.updateProjectOutcome(projectId, editingOutcome.id, {
        title: editingOutcome.title,
        description: editingOutcome.description,
        target: editingOutcome.target,
        current: editingOutcome.current,
        progress: editingOutcome.progress,
        unit: editingOutcome.unit,
      });
      triggerDataRefresh();
      const [outcomesData, kpisData] = await Promise.all([
        getProjectOutcomes(projectId),
        getProjectKPIs(projectId),
      ]);
      setOutcomes(outcomesData);
      setAllKPIs(kpisData);
      setEditingOutcome(null);
    } catch (e) {
      console.error('Failed to update outcome:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveKpi = async () => {
    if (!projectId || !editingKpi) return;
    setIsSaving(true);
    try {
      await projectDataApi.updateProjectKPI(projectId, editingKpi.id, {
        name: editingKpi.name,
        title: editingKpi.name,
        target: editingKpi.target,
        current: editingKpi.current ?? editingKpi.value,
        unit: editingKpi.unit,
      });
      triggerDataRefresh();
      const [outcomesData, kpisData] = await Promise.all([
        getProjectOutcomes(projectId),
        getProjectKPIs(projectId),
      ]);
      setOutcomes(outcomesData);
      setAllKPIs(kpisData);
      setEditingKpi(null);
    } catch (e) {
      console.error('Failed to update KPI:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-8 overflow-x-hidden w-full">
      {/* Header with outcome filter */}
      <div className="flex flex-col md:flex-row md:items-center md:gap-4 mb-4 w-full max-w-full">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground break-words whitespace-normal">{projectName} KPI Analytics</h1>
          <p className="text-muted-foreground">
            Key performance indicators for {projectName}, grouped by outcome
          </p>
        </div>
        {outcomes.length > 0 && (
          <select
            className="border rounded px-3 py-2 text-base min-w-0 w-full md:w-auto"
            value={selectedOutcome || ''}
            onChange={e => setSelectedOutcome(e.target.value || undefined)}
          >
            <option value="">All Outcomes</option>
            {outcomes.map((outcome: any) => (
              <option key={outcome.id} value={outcome.id}>{outcome.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Display KPIs grouped by outcome */}
      {Object.entries(groupedKPIs).map(([outcomeId, kpis]) => {
        const outcome = outcomes.find((o: any) => o.id === outcomeId);
        const outcomeTitle = outcome?.title || outcomeId;
        
        return (
          <Card key={outcomeId} className="transition-all duration-200 hover:shadow-md break-words whitespace-normal w-full max-w-full">
            <CardHeader className="w-full max-w-full">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="break-words whitespace-normal w-full max-w-full">{outcomeTitle}</CardTitle>
                {outcome && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingOutcome({ ...outcome })}
                    className="shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {outcome && (
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  <span>Current: {outcome.current ?? 0} / Target: {outcome.target} {outcome.unit}</span>
                  {outcome.progress != null && <span>Progress: {outcome.progress}%</span>}
                </div>
              )}
            </CardHeader>
            <CardContent className="w-full max-w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-full">
                {kpis.map((kpi: any, idx: number) => (
                  <Card key={kpi.id ?? idx} className="bg-muted/50 break-words whitespace-normal w-full max-w-full min-w-0">
                    <CardHeader className="w-full max-w-full min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold break-words whitespace-normal w-full max-w-full">{kpi.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingKpi({ ...kpi })}
                          className="shrink-0 h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="break-words whitespace-normal w-full max-w-full min-w-0">
                      {kpi.type === 'radialGauge' && (
                        <RadialGauge value={kpi.current || kpi.value} size={120} unit={kpi.unit} primaryColor="#3B82F6" />
                      )}
                      {kpi.type === 'bar' && (
                        <StackedBarChart
                          data={[
                            { name: kpi.name, Actual: kpi.current || kpi.value, Target: kpi.target }
                          ]}
                          height={120}
                          colors={["#3B82F6", "#E5E7EB"]}
                        />
                      )}
                      {kpi.type === 'progress' && (
                        <div className="w-full max-w-full min-w-0">
                          <div className="mb-2 text-sm font-medium">{kpi.current || kpi.value} / {kpi.target} {kpi.unit}</div>
                          <Progress value={((kpi.current || kpi.value) / kpi.target) * 100} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Show message if no KPIs for selected outcome */}
      {selectedOutcome && Object.keys(groupedKPIs).length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>No KPIs available for the selected outcome.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Outcome Dialog */}
      <Dialog open={!!editingOutcome} onOpenChange={(open) => !open && setEditingOutcome(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Outcome</DialogTitle>
            <DialogDescription>Update current value, target, progress, and other fields.</DialogDescription>
          </DialogHeader>
          {editingOutcome && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input
                  value={editingOutcome.title}
                  onChange={(e) => setEditingOutcome((o) => (o ? { ...o, title: e.target.value } : null))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={editingOutcome.description ?? ''}
                  onChange={(e) => setEditingOutcome((o) => (o ? { ...o, description: e.target.value } : null))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Current Value</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingOutcome.current ?? 0}
                    onChange={(e) => setEditingOutcome((o) => (o ? { ...o, current: parseFloat(e.target.value) || 0 } : null))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingOutcome.target ?? 0}
                    onChange={(e) => setEditingOutcome((o) => (o ? { ...o, target: parseFloat(e.target.value) || 0 } : null))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Unit</Label>
                  <Input
                    value={editingOutcome.unit ?? ''}
                    onChange={(e) => setEditingOutcome((o) => (o ? { ...o, unit: e.target.value } : null))}
                    placeholder="e.g. people, %"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Progress (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingOutcome.progress ?? 0}
                    onChange={(e) => setEditingOutcome((o) => (o ? { ...o, progress: parseFloat(e.target.value) || 0 } : null))}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOutcome(null)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveOutcome} disabled={isSaving || !editingOutcome}>{isSaving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit KPI Dialog */}
      <Dialog open={!!editingKpi} onOpenChange={(open) => !open && setEditingKpi(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit KPI</DialogTitle>
            <DialogDescription>Update current value, target, and unit.</DialogDescription>
          </DialogHeader>
          {editingKpi && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={editingKpi.name ?? ''}
                  onChange={(e) => setEditingKpi((prev: any) => (prev ? { ...prev, name: e.target.value } : null))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Current Value</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingKpi.current ?? editingKpi.value ?? 0}
                    onChange={(e) => setEditingKpi((prev: any) => (prev ? { ...prev, current: parseFloat(e.target.value) || 0 } : null))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingKpi.target ?? 0}
                    onChange={(e) => setEditingKpi((prev: any) => (prev ? { ...prev, target: parseFloat(e.target.value) || 0 } : null))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Input
                  value={editingKpi.unit ?? ''}
                  onChange={(e) => setEditingKpi((prev: any) => (prev ? { ...prev, unit: e.target.value } : null))}
                  placeholder="e.g. people, %"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingKpi(null)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveKpi} disabled={isSaving || !editingKpi}>{isSaving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 