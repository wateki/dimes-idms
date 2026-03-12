import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { RadialGauge } from '@/components/visualizations/RadialGauge';
import { StackedBarChart } from '@/components/visualizations/StackedBarChart';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { projectDataApi } from '@/lib/api/projectDataApi';
import { Outcome } from '@/types/dashboard';
import { Pencil } from 'lucide-react';

export function OutcomesDetails() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { getProjectOutcomes, getProjectKPIs, dataRefreshTrigger, triggerDataRefresh } = useProjects();
  const [selectedOutcome, setSelectedOutcome] = useState<string | undefined>(undefined);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [allKPIs, setAllKPIs] = useState<any[]>([]);
  const [editingOutcome, setEditingOutcome] = useState<Outcome | null>(null);
  const [editingKpi, setEditingKpi] = useState<{ kpi: any; outcomeId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;
  if (!projectId) {
    return <div>No project selected</div>;
  }

  // Load project data
  useEffect(() => {
    const loadData = async () => {
      if (projectId && user) {
        try {
          console.log(`🔄 OutcomesDetails: Loading data for project ${projectId} (refresh trigger: ${dataRefreshTrigger})`);
          const [outcomesData, kpisData] = await Promise.all([
            getProjectOutcomes(projectId),
            getProjectKPIs(projectId)
          ]);
          setOutcomes(outcomesData);
          setAllKPIs(kpisData);
          console.log(`✅ OutcomesDetails: Loaded ${outcomesData.length} outcomes, ${kpisData.length} KPIs`);
        } catch (error) {
          console.error('Error loading outcomes data:', error);
        }
      }
    };

    loadData();
  }, [projectId, user, getProjectOutcomes, getProjectKPIs, dataRefreshTrigger]);

  const filteredOutcomes = selectedOutcome
    ? outcomes.filter((o: any) => o.id === selectedOutcome)
    : outcomes;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_TRACK':
        return 'bg-green-100 text-green-800';
      case 'AT_RISK':
        return 'bg-yellow-100 text-yellow-800';
      case 'BEHIND':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
      await projectDataApi.updateProjectKPI(projectId, editingKpi.kpi.id, {
        name: editingKpi.kpi.name,
        title: editingKpi.kpi.name,
        target: editingKpi.kpi.target,
        current: editingKpi.kpi.current ?? editingKpi.kpi.value,
        unit: editingKpi.kpi.unit,
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
      <div className="flex flex-col md:flex-row md:items-center md:gap-4 mb-4 w-full max-w-full">
        <h1 className="text-3xl font-bold text-foreground flex-1 break-words whitespace-normal">Project Outcomes & KPIs</h1>
        <select
          className="border rounded px-3 py-2 text-base min-w-0 w-full md:w-auto"
          value={selectedOutcome || ''}
          onChange={e => setSelectedOutcome(e.target.value || undefined)}
        >
          <option value="">All Outcomes</option>
          {outcomes.map((o: any) => (
            <option key={o.id} value={o.id}>{o.title}</option>
          ))}
        </select>
      </div>
      {filteredOutcomes.map((outcome: any) => {
        const outcomeKPIs = allKPIs.filter((k: any) => k.outcomeId === outcome.id);
        return (
          <Card key={outcome.id} className="transition-all duration-200 hover:shadow-md break-words whitespace-normal w-full max-w-full">
            <CardHeader className="w-full max-w-full">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="break-words whitespace-normal w-full max-w-full">{outcome.title}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingOutcome({ ...outcome })}
                  className="shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 w-full max-w-full">
                <Badge className={getStatusColor(outcome.status)}>{outcome.status}</Badge>
                <span className="text-muted-foreground break-words whitespace-normal w-full max-w-full">{outcome.description}</span>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                <span>Current: {outcome.current ?? 0} / Target: {outcome.target} {outcome.unit}</span>
                {outcome.progress != null && <span>Progress: {outcome.progress}%</span>}
              </div>
            </CardHeader>
            <CardContent className="w-full max-w-full">
              {outcomeKPIs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-full">
                  {outcomeKPIs.map((kpi: any, idx: number) => (
                    <Card key={kpi.id ?? idx} className="bg-muted/50 break-words whitespace-normal w-full max-w-full min-w-0">
                      <CardHeader className="w-full max-w-full min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-semibold break-words whitespace-normal w-full max-w-full">{kpi.name}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingKpi({ kpi: { ...kpi }, outcomeId: outcome.id })}
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
              ) : (
                <div className="text-muted-foreground">No KPIs for this outcome.</div>
              )}
            </CardContent>
          </Card>
        );
      })}

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
                  value={editingKpi.kpi.name ?? ''}
                  onChange={(e) => setEditingKpi((prev) => (prev ? { ...prev, kpi: { ...prev.kpi, name: e.target.value } } : null))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Current Value</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingKpi.kpi.current ?? editingKpi.kpi.value ?? 0}
                    onChange={(e) => setEditingKpi((prev) =>
                      prev ? { ...prev, kpi: { ...prev.kpi, current: parseFloat(e.target.value) || 0 } } : null
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingKpi.kpi.target ?? 0}
                    onChange={(e) => setEditingKpi((prev) =>
                      prev ? { ...prev, kpi: { ...prev.kpi, target: parseFloat(e.target.value) || 0 } } : null
                    )}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Input
                  value={editingKpi.kpi.unit ?? ''}
                  onChange={(e) => setEditingKpi((prev) =>
                    prev ? { ...prev, kpi: { ...prev.kpi, unit: e.target.value } } : null
                  )}
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