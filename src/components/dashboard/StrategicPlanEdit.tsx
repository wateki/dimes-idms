import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, ArrowLeft, Edit3, Eye } from 'lucide-react';
import { strategicPlanApi } from '@/lib/api/strategicPlanApi';
import { useProjects } from '@/contexts/ProjectsContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Project, Activity } from '@/types/dashboard';

interface SubGoal {
  id: string;
  title: string;
  description: string;
  kpi: {
    currentValue: number;
    targetValue: number;
    unit: string;
    type: string;
  };
  activityLinks: ActivityLink[];
}

interface ActivityLink {
  projectId: string;
  projectName: string;
  activityId: string;
  activityTitle: string;
  contribution: number;
  status: 'contributing' | 'at-risk' | 'not-contributing';
}

interface StrategicGoal {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  targetOutcome: string;
  subgoals: SubGoal[];
}

export function StrategicPlanEdit() {
  const navigate = useNavigate();
  const { projects, getProjectActivities } = useProjects();
  const { addNotification } = useNotifications();
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endYear, setEndYear] = useState(new Date().getFullYear() + 4);
  const [availableActivities, setAvailableActivities] = useState<Record<string, Activity[]>>({});

  // Load activities for a project
  const loadProjectActivities = async (projectId: string) => {
    if (!availableActivities[projectId]) {
      try {
        const project = projects.find(p => p.id === projectId);
        const projectName = project?.name || 'Selected Project';
        
        addNotification({
          type: 'info',
          title: 'Loading Activities',
          message: `Loading activities for ${projectName}...`,
          duration: 2000,
        });
        
        const activities = await getProjectActivities(projectId);
        setAvailableActivities(prev => ({
          ...prev,
          [projectId]: activities
        }));
        
        addNotification({
          type: 'success',
          title: 'Activities Loaded',
          message: `Loaded ${activities.length} activities for ${projectName}`,
          duration: 3000,
        });
      } catch (error) {
        console.error('Error loading project activities:', error);
        addNotification({
          type: 'error',
          title: 'Failed to Load Activities',
          message: 'Please try selecting the project again.',
          duration: 4000,
        });
      }
    }
  };

  useEffect(() => {
    // Load existing strategic plan data
    loadStrategicPlan();
  }, []);

  const loadStrategicPlan = async () => {
    try {
      setIsLoading(true);
      // First try to load active plan for the organization
      let planToLoad = await strategicPlanApi.getActiveStrategicPlan();
      
      // If no active plan, try to load the most recent plan for the organization
      if (!planToLoad) {
        const allPlans = await strategicPlanApi.getStrategicPlans();
        if (allPlans && allPlans.length > 0) {
          // Use the most recent plan (they're already sorted by createdAt descending)
          planToLoad = allPlans[0];
         /*  addNotification({
            type: 'info',
            title: 'No Active Plan Found',
            message: `Loaded the most recent strategic plan (${planToLoad.startYear}-${planToLoad.endYear}) for your organization.`,
            duration: 4000,
          }); */
        }
      }
      
      if (planToLoad) {
        setCurrentPlanId(planToLoad.id);
        setStartYear(planToLoad.startYear);
        setEndYear(planToLoad.endYear);
        const convertedGoals: StrategicGoal[] = planToLoad.goals.map(goal => ({
          id: goal.id,
          title: goal.title,
          description: goal.description,
          priority: goal.priority.toLowerCase() as 'high' | 'medium' | 'low',
          targetOutcome: goal.targetOutcome,
          subgoals: goal.subgoals.map(subGoal => ({
            id: subGoal.id,
            title: subGoal.title,
            description: subGoal.description,
            kpi: {
              currentValue: subGoal.kpi?.currentValue || 0,
              targetValue: subGoal.kpi?.targetValue || 0,
              unit: subGoal.kpi?.unit || '',
              type: subGoal.kpi?.type || 'radialGauge'
            },
            activityLinks: (subGoal.activityLinks || []).map(activity => ({
              projectId: activity.projectId,
              projectName: activity.projectName,
              activityId: activity.activityId,
              activityTitle: activity.activityTitle,
              contribution: activity.contribution,
              status: activity.status.toLowerCase().replace('_', '-') as 'contributing' | 'at-risk' | 'not-contributing'
            }))
          }))
        }));
        setGoals(convertedGoals);
        addNotification({
          type: 'success',
          title: 'Strategic Plan Loaded Successfully',
          message: `Loaded ${convertedGoals.length} strategic goals from your organization's plan (${planToLoad.startYear}-${planToLoad.endYear}).`,
          duration: 3000,
        });
      } else {
        // No plans found for the organization - show empty state
        setGoals([]);
        setCurrentPlanId(null);
        addNotification({
          type: 'info',
          title: 'No Strategic Plan Found',
          message: 'No strategic plan found for your organization. Please create a new plan.',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error loading strategic plan:', error);
      setGoals([]);
      setCurrentPlanId(null);
      addNotification({
        type: 'error',
        title: 'Failed to Load Strategic Plan',
        message: error instanceof Error ? error.message : 'Please try again or create a new plan.',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  const addGoal = () => {
    const newGoal: StrategicGoal = {
      id: `goal-${Date.now()}`,
      title: '',
      description: '',
      priority: 'medium',
      targetOutcome: '',
      subgoals: []
    };
    setGoals([...goals, newGoal]);
  };

  const updateGoal = (goalId: string, field: keyof StrategicGoal, value: any) => {
    setGoals(goals.map(goal => 
      goal.id === goalId ? { ...goal, [field]: value } : goal
    ));
  };

  const removeGoal = (goalId: string) => {
    setGoals(goals.filter(goal => goal.id !== goalId));
  };

  const addSubGoal = (goalId: string) => {
    const newSubGoal: SubGoal = {
      id: `subgoal-${Date.now()}`,
      title: '',
      description: '',
      kpi: {
        currentValue: 0,
        targetValue: 0,
        unit: '',
        type: 'radialGauge'
      },
      activityLinks: []
    };

    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, subgoals: [...goal.subgoals, newSubGoal] }
        : goal
    ));
  };

  const updateSubGoal = (goalId: string, subGoalId: string, field: keyof SubGoal, value: any) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? {
            ...goal,
            subgoals: goal.subgoals.map(subGoal =>
              subGoal.id === subGoalId ? { ...subGoal, [field]: value } : subGoal
            )
          }
        : goal
    ));
  };

  const removeSubGoal = (goalId: string, subGoalId: string) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, subgoals: goal.subgoals.filter(subGoal => subGoal.id !== subGoalId) }
        : goal
    ));
  };

  const addActivityLink = (goalId: string, subGoalId: string) => {
    const newActivityLink: ActivityLink = {
      projectId: '',
      projectName: '',
      activityId: '',
      activityTitle: '',
      contribution: 0,
      status: 'contributing'
    };

    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? {
            ...goal,
            subgoals: goal.subgoals.map(subGoal =>
              subGoal.id === subGoalId 
                ? { ...subGoal, activityLinks: [...subGoal.activityLinks, newActivityLink] }
                : subGoal
            )
          }
        : goal
    ));
  };

  const updateActivityLink = (goalId: string, subGoalId: string, activityIndex: number, field: keyof ActivityLink, value: any) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? {
            ...goal,
            subgoals: goal.subgoals.map(subGoal =>
              subGoal.id === subGoalId 
                ? {
                    ...subGoal,
                    activityLinks: subGoal.activityLinks.map((activity, index) => {
                      if (index === activityIndex) {
                        const updatedActivity = { ...activity, [field]: value };
                        
                        // If project is selected, auto-fill project name and load activities
                        if (field === 'projectId' && value) {
                          const selectedProject = projects.find(p => p.id === value);
                          if (selectedProject) {
                            updatedActivity.projectName = selectedProject.name;
                            // Load activities for the selected project
                            loadProjectActivities(value);
                          }
                        }
                        
                        // If activity is selected, auto-fill activity details
                        if (field === 'activityId' && value && activity.projectId) {
                          const projectActivities = availableActivities[activity.projectId] || [];
                          const selectedActivity = projectActivities.find(a => a.id === value);
                          if (selectedActivity) {
                            updatedActivity.activityTitle = selectedActivity.title;
                          }
                        }
                        
                        return updatedActivity;
                      }
                      return activity;
                    })
                  }
                : subGoal
            )
          }
        : goal
    ));
  };

  const removeActivityLink = (goalId: string, subGoalId: string, activityIndex: number) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? {
            ...goal,
            subgoals: goal.subgoals.map(subGoal =>
              subGoal.id === subGoalId 
                ? {
                    ...subGoal,
                    activityLinks: subGoal.activityLinks.filter((_, index) => index !== activityIndex)
                  }
                : subGoal
            )
          }
        : goal
    ));
  };

  const handleSave = async () => {
    // Validate that we have at least one goal
    if (goals.length === 0) {
      addNotification({
        type: 'error',
        title: 'Cannot Save Empty Strategic Plan',
        message: 'Please add at least one strategic goal before saving.',
        duration: 4000,
      });
      return;
    }

    // Validate that all goals have titles
    const goalsWithoutTitles = goals.filter(goal => !goal.title.trim());
    if (goalsWithoutTitles.length > 0) {
      addNotification({
        type: 'error',
        title: 'Incomplete Strategic Goals',
        message: 'All strategic goals must have a title.',
        duration: 4000,
      });
      return;
    }

    // Validate that all activity links have both project and activity selected
    const hasIncompleteActivityLinks = goals.some(goal => 
      goal.subgoals.some(subGoal => 
        subGoal.activityLinks.some(activity => 
          !activity.projectId || !activity.activityId
        )
      )
    );

    if (hasIncompleteActivityLinks) {
      addNotification({
        type: 'error',
        title: 'Incomplete Activity Links',
        message: 'All activity links must have both a project and activity selected.',
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);
    try {
      let result;
      const subgoalCount = goals.reduce((sum, goal) => sum + goal.subgoals.length, 0);
      
      if (currentPlanId) {
        result = await strategicPlanApi.updateStrategicPlan(currentPlanId, goals, startYear, endYear);
        const planTitle = result?.title || 'Strategic Plan';
        addNotification({
          type: 'success',
          title: `Strategic Plan "${planTitle}" Updated Successfully`,
          message: `Updated for ${startYear}-${endYear} with ${goals.length} strategic goals and ${subgoalCount} subgoals.`,
          duration: 5000,
        });
      } else {
        result = await strategicPlanApi.createStrategicPlan(goals, startYear, endYear);
        const planTitle = result?.title || 'Strategic Plan';
        addNotification({
          type: 'success',
          title: `Strategic Plan "${planTitle}" Created Successfully`,
          message: `Created for ${startYear}-${endYear} with ${goals.length} strategic goals and ${subgoalCount} subgoals.`,
          duration: 5000,
        });
      }
      setIsEditing(false);
      // Reload the data to get the updated version
      await loadStrategicPlan();
    } catch (error) {
      console.error('Error updating strategic plan:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Update Strategic Plan',
        message: 'Please check your input and try again.',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    loadStrategicPlan(); // Reload original data
    setIsEditing(false);
    addNotification({
      type: 'info',
      title: 'Strategic Plan Editing Cancelled',
      message: 'All changes have been discarded.',
      duration: 3000,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Strategic Plan</h1>
            <p className="text-muted-foreground">Modify organizational goals, subgoals, and their linkages</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="flex items-center space-x-2">
              <Edit3 className="h-4 w-4" />
              <span>Edit Strategic Plan</span>
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading} className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Year Range Display/Edit */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Plan Period</CardTitle>
          <CardDescription>
            {isEditing ? 'Modify the start and end years for this strategic plan' : `Plan period: ${startYear} - ${endYear}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-year">Start Year</Label>
              <Input
                id="start-year"
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                min="2020"
                max="2030"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-year">End Year</Label>
              <Input
                id="end-year"
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value))}
                min={startYear}
                max="2030"
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Loading strategic plan...</p>
            </CardContent>
          </Card>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No strategic plan found for your organization.
              </p>
              <Button
                onClick={() => navigate('/dashboard/strategic-plan/create')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Strategic Plan</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal, goalIndex) => (
          <Card key={goal.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">Goal {goalIndex + 1}</Badge>
                  <CardTitle className="text-xl">{goal.title || 'Strategic Goal'}</CardTitle>
                  <Badge variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'medium' ? 'default' : 'secondary'}>
                    {goal.priority}
                  </Badge>
                </div>
                {isEditing && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeGoal(goal.id)}
                    className="flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Remove Goal</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`goal-title-${goal.id}`}>Goal Title</Label>
                  <Input
                    id={`goal-title-${goal.id}`}
                    value={goal.title}
                    onChange={(e) => updateGoal(goal.id, 'title', e.target.value)}
                    placeholder="Enter strategic goal title"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`goal-priority-${goal.id}`}>Priority</Label>
                  <Select 
                    value={goal.priority} 
                    onValueChange={(value) => updateGoal(goal.id, 'priority', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`goal-description-${goal.id}`}>Description</Label>
                <Textarea
                  id={`goal-description-${goal.id}`}
                  value={goal.description}
                  onChange={(e) => updateGoal(goal.id, 'description', e.target.value)}
                  placeholder="Describe the strategic goal"
                  rows={3}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`goal-outcome-${goal.id}`}>Target Outcome</Label>
                <Input
                  id={`goal-outcome-${goal.id}`}
                  value={goal.targetOutcome}
                  onChange={(e) => updateGoal(goal.id, 'targetOutcome', e.target.value)}
                  placeholder="Expected outcome of this goal"
                  disabled={!isEditing}
                />
              </div>

              {/* Subgoals */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Subgoals ({goal.subgoals.length})</h3>
                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSubGoal(goal.id)}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Subgoal</span>
                    </Button>
                  )}
                </div>

                {goal.subgoals.map((subGoal, subGoalIndex) => (
                  <Card key={subGoal.id} className="bg-gray-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">Subgoal {subGoalIndex + 1}</Badge>
                          <span className="text-sm font-medium">{subGoal.title}</span>
                        </div>
                        {isEditing && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSubGoal(goal.id, subGoal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`subgoal-title-${subGoal.id}`}>Subgoal Title</Label>
                          <Input
                            id={`subgoal-title-${subGoal.id}`}
                            value={subGoal.title}
                            onChange={(e) => updateSubGoal(goal.id, subGoal.id, 'title', e.target.value)}
                            placeholder="Enter subgoal title"
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`subgoal-unit-${subGoal.id}`}>KPI Unit</Label>
                          <Input
                            id={`subgoal-unit-${subGoal.id}`}
                            value={subGoal.kpi.unit}
                            onChange={(e) => updateSubGoal(goal.id, subGoal.id, 'kpi', { ...subGoal.kpi, unit: e.target.value })}
                            placeholder="e.g., parents, %, people"
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`subgoal-description-${subGoal.id}`}>Description</Label>
                        <Textarea
                          id={`subgoal-description-${subGoal.id}`}
                          value={subGoal.description}
                          onChange={(e) => updateSubGoal(goal.id, subGoal.id, 'description', e.target.value)}
                          placeholder="Describe the subgoal"
                          rows={2}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`subgoal-current-${subGoal.id}`}>Current Value</Label>
                          <Input
                            id={`subgoal-current-${subGoal.id}`}
                            type="number"
                            value={subGoal.kpi.currentValue}
                            onChange={(e) => updateSubGoal(goal.id, subGoal.id, 'kpi', { ...subGoal.kpi, currentValue: Number(e.target.value) })}
                            placeholder="0"
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`subgoal-target-${subGoal.id}`}>Target Value</Label>
                          <Input
                            id={`subgoal-target-${subGoal.id}`}
                            type="number"
                            value={subGoal.kpi.targetValue}
                            onChange={(e) => updateSubGoal(goal.id, subGoal.id, 'kpi', { ...subGoal.kpi, targetValue: Number(e.target.value) })}
                            placeholder="0"
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      {/* Activity Links */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-md font-medium">Linked Activities ({subGoal.activityLinks.length})</h4>
                          {isEditing && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addActivityLink(goal.id, subGoal.id)}
                              className="flex items-center space-x-2"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Add Activity</span>
                            </Button>
                          )}
                        </div>

                        {subGoal.activityLinks.map((activity, activityIndex) => (
                          <Card key={activityIndex} className="bg-white border">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">Activity {activityIndex + 1}</Badge>
                                  <Badge variant={
                                    activity.status === 'contributing' ? 'default' :
                                    activity.status === 'at-risk' ? 'destructive' : 'secondary'
                                  }>
                                    {activity.status}
                                  </Badge>
                                </div>
                                {isEditing && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeActivityLink(goal.id, subGoal.id, activityIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Project</Label>
                                  <Select
                                    value={activity.projectId}
                                    onValueChange={(value) => updateActivityLink(goal.id, subGoal.id, activityIndex, 'projectId', value)}
                                    disabled={!isEditing}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                          {project.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Project Name</Label>
                                  <Input
                                    value={activity.projectName}
                                    readOnly
                                    placeholder="Auto-filled from project selection"
                                    className="bg-gray-50"
                                    disabled={!isEditing}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Activity</Label>
                                  <Select
                                    value={activity.activityId}
                                    onValueChange={(value) => updateActivityLink(goal.id, subGoal.id, activityIndex, 'activityId', value)}
                                    disabled={!isEditing || !activity.projectId}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={activity.projectId ? "Select an activity" : "Select a project first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {activity.projectId && availableActivities[activity.projectId]?.map((activityItem) => (
                                        <SelectItem key={activityItem.id} value={activityItem.id}>
                                          {activityItem.title}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Activity Title</Label>
                                  <Input
                                    value={activity.activityTitle}
                                    readOnly
                                    placeholder="Auto-filled from activity selection"
                                    className="bg-gray-50"
                                    disabled={!isEditing}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Contribution (%)</Label>
                                  <Input
                                    type="number"
                                    value={activity.contribution}
                                    onChange={(e) => updateActivityLink(goal.id, subGoal.id, activityIndex, 'contribution', Number(e.target.value))}
                                    placeholder="0"
                                    min="0"
                                    max="100"
                                    disabled={!isEditing}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Status</Label>
                                  <Select 
                                    value={activity.status} 
                                    onValueChange={(value) => updateActivityLink(goal.id, subGoal.id, activityIndex, 'status', value)}
                                    disabled={!isEditing}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="contributing">Contributing</SelectItem>
                                      <SelectItem value="at-risk">At Risk</SelectItem>
                                      <SelectItem value="not-contributing">Not Contributing</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
        )
        }

        {isEditing && (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-8 text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={addGoal}
                className="flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add Strategic Goal</span>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
