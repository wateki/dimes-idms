import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Target, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RadialGauge } from '@/components/visualizations/RadialGauge';
import { BulletChart } from '@/components/visualizations/BulletChart';
import { PieChart } from '@/components/visualizations/PieChart';
import { StrategicGoal, StrategicSubGoal, StrategicActivityLink } from '@/lib/api/strategicPlanApi';

interface GoalDetailsProps {
  goal?: StrategicGoal;
  goals?: StrategicGoal[];
  subGoal?: StrategicSubGoal;
}

export function GoalDetails({ goal: propGoal, goals, subGoal: propSubGoal }: GoalDetailsProps) {
  const { goalId, subGoalId } = useParams();
  const location = useLocation();
  const [selectedSubGoal, setSelectedSubGoal] = useState<string | undefined>(subGoalId);

  // Get goal data from location state (passed from navigation) or props
  const stateGoal = location.state?.goal;
  const stateGoals = location.state?.goals;
  const stateSubGoal = location.state?.subGoal;
  
  // Find goal from location state, props, or by ID from goals array
  const goal = stateGoal || propGoal || (stateGoals && goalId ? stateGoals.find((g: StrategicGoal) => g.id === goalId) : undefined) || (goals && goalId ? goals.find((g: StrategicGoal) => g.id === goalId) : undefined);
  
  // Find specific subgoal from location state, props, or by ID from goal's subgoals
  const specificSubGoal = stateSubGoal || propSubGoal || (subGoalId && goal ? 
    goal.subgoals.find((sg: StrategicSubGoal) => sg.id === subGoalId) : undefined);

  if (!goal) {
    return (
      <div className="flex flex-col space-y-8 overflow-x-hidden w-full max-w-full px-2 md:px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Goal Not Found</h1>
          <p className="text-muted-foreground">The requested organizational goal could not be found.</p>
          <Link to="/dashboard">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'contributing':
        return 'bg-green-100 text-green-800';
      case 'at-risk':
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'not-contributing':
      case 'not_contributing':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderKPIVisualization = (kpi: any) => {
    const currentValue = kpi.currentValue || kpi.value || 0;
    const targetValue = kpi.targetValue || kpi.target || 1;
    
    switch (kpi.type) {
      case 'radialGauge':
        return (
          <RadialGauge 
            value={(currentValue / targetValue) * 100} 
            size={150} 
            unit={kpi.unit} 
            primaryColor="#3B82F6"
            max={100}
          />
        );
      case 'bulletChart':
        return (
          <BulletChart
            current={currentValue}
            target={targetValue}
            title="Progress"
            unit={kpi.unit}
            height={100}
          />
        );
      case 'progressBar':
        return (
          <div className="w-full">
            <div className="mb-2 text-sm font-medium">
              {currentValue.toLocaleString()} / {targetValue.toLocaleString()} {kpi.unit}
            </div>
            <Progress value={(currentValue / targetValue) * 100} className="h-3" />
            <div className="mt-1 text-xs text-muted-foreground">
              {Math.round((currentValue / targetValue) * 100)}% Complete
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const ActivityConnectionCard = ({ activity }: { activity: StrategicActivityLink }) => (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-foreground">{activity.activityTitle}</h4>
            <p className="text-xs text-muted-foreground">{activity.projectName}</p>
          </div>
          <Badge className={getStatusColor(activity.status)}>
            {activity.status.replace('_', ' ').replace('-', ' ')}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">Contribution</span>
            <span className="text-sm font-bold text-foreground">{activity.contribution}%</span>
          </div>
          <Progress value={activity.contribution} className="h-2" />
          
          <Link to={`/dashboard/projects/${activity.projectId}/activities`}>
            <Button variant="outline" size="sm" className="w-full mt-2">
              <Activity className="w-3 h-3 mr-1" />
              View in Project
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  // If viewing a specific subgoal
  if (specificSubGoal) {
    return (
      <div className="flex flex-col space-y-8 overflow-x-hidden w-full max-w-full px-2 md:px-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link 
            to={`/dashboard/goals/${goal.id}`}
            state={{ goal, goals: [goal] }}
          >
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Goal
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{specificSubGoal.title}</h1>
            <p className="text-muted-foreground">{specificSubGoal.description}</p>
          </div>
        </div>

        {/* KPI Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Key Performance Indicator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              {renderKPIVisualization(specificSubGoal.kpi)}
            </div>
          </CardContent>
        </Card>

        {/* Contributing Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Contributing Project Activities ({specificSubGoal.activityLinks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {specificSubGoal.activityLinks.map((activity: StrategicActivityLink, index: number) => (
                <ActivityConnectionCard key={index} activity={activity} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate project contribution data for pie chart
  const projectContributions = new Map<string, { name: string; value: number; activities: number }>();
  
  goal.subgoals.forEach((subGoal: StrategicSubGoal) => {
    subGoal.activityLinks.forEach((activity: StrategicActivityLink) => {
      const projectId = activity.projectId;
      if (!projectId) return;
      const existing = projectContributions.get(projectId);
      if (existing) {
        existing.value += activity.contribution;
        existing.activities += 1;
      } else {
        projectContributions.set(projectId, {
          name: activity.projectName ?? '',
          value: activity.contribution,
          activities: 1
        });
      }
    });
  });

  const pieChartData = Array.from(projectContributions.values()).map(project => ({
    name: project.name,
    value: Math.round(project.value / project.activities), // Average contribution
    activities: project.activities
  }));

  return (
    <div className="flex flex-col space-y-8 overflow-x-hidden w-full max-w-full px-2 md:px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{goal.title}</h1>
            <Badge className={getPriorityColor(goal.priority)}>
              {goal.priority.toLowerCase()} priority
            </Badge>
          </div>
          <p className="text-muted-foreground">{goal.description}</p>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>Target Outcome:</strong> {goal.targetOutcome}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sub-Goals</p>
                <p className="text-3xl font-bold text-foreground">{goal.subgoals.length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contributing Projects</p>
                <p className="text-3xl font-bold text-foreground">{projectContributions.size}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Activities</p>
                <p className="text-3xl font-bold text-foreground">
                  {goal.subgoals.reduce((sum: number, sg: StrategicSubGoal) => sum + sg.activityLinks.length, 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Contributions Visualization */}
      {pieChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Contributions to Goal</CardTitle>
            <p className="text-sm text-muted-foreground">
              Average contribution percentage by project across all sub-goals
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <PieChart 
                data={pieChartData}
                height={300}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-Goals */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Sub-Goals & Project Activities</h2>
        
        {goal.subgoals.map((subGoal: StrategicSubGoal, index: number) => (
          <Card key={subGoal.id} className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{subGoal.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{subGoal.description}</p>
                </div>
                <Link 
                  to={`/dashboard/goals/${goal.id}/subgoals/${subGoal.id}`}
                  state={{ goal, goals: [goal], subGoal }}
                >
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* KPI Visualization */}
                <div className="flex justify-center items-center">
                  {renderKPIVisualization(subGoal.kpi)}
                </div>

                {/* Contributing Activities */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Contributing Activities ({subGoal.activityLinks.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {subGoal.activityLinks.map((activity: StrategicActivityLink, actIndex: number) => (
                      <div 
                        key={actIndex}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{activity.activityTitle}</p>
                          <p className="text-xs text-muted-foreground">{activity.projectName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(activity.status)} variant="secondary">
                            {activity.contribution}%
                          </Badge>
                          <Link to={`/dashboard/projects/${activity.projectId}/activities`}>
                            <Button variant="ghost" size="sm">
                              <Activity className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}