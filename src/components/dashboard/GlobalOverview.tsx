import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadialGauge } from '@/components/visualizations/RadialGauge';
import { StackedBarChart } from '@/components/visualizations/StackedBarChart';
import { AreaChart } from '@/components/visualizations/AreaChart';
import { BulletChart } from '@/components/visualizations/BulletChart';
import { PieChart } from '@/components/visualizations/PieChart';
import { Progress } from '@/components/ui/progress';
import { Target, Activity, TrendingUp, ChevronRight, Calendar } from 'lucide-react';
import { strategicPlanApi, StrategicPlan, StrategicGoal } from '@/lib/api/strategicPlanApi';
import { toast } from 'sonner';
import { useTour } from '@/contexts/TourContext';
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser';

// Helper functions
const getPriorityColor = (priority: string) => {
  switch (priority) {
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

const getOverallProgress = (subgoals: any[]) => {
  if (subgoals.length === 0) return 0;
  const totalProgress = subgoals.reduce((sum, subgoal) => {
    const currentValue = subgoal.kpi?.currentValue || subgoal.kpi?.value || 0;
    const targetValue = subgoal.kpi?.targetValue || subgoal.kpi?.target || 1;
    return sum + (currentValue / targetValue) * 100;
  }, 0);
  return Math.round(totalProgress / subgoals.length);
};

export function GlobalOverview() {
  const { startTour } = useTour();
  const { isFirstTime, checked: firstTimeChecked } = useFirstTimeUser();
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [allPlans, setAllPlans] = useState<StrategicPlan[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Array<{id: string, title: string, startYear: number, endYear: number}>>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  
  // Automatically start tour for first-time users
  useEffect(() => {
    if (firstTimeChecked && isFirstTime && !isLoading) {
      // Delay to ensure the page is fully loaded
      const timer = setTimeout(() => {
        console.log('[Global Overview] Starting tour for first-time user');
        startTour();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [firstTimeChecked, isFirstTime, isLoading, startTour]);

  useEffect(() => {
    loadAllPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId && allPlans.length > 0) {
      const selectedPlan = allPlans.find(plan => plan.id === selectedPlanId);
      if (selectedPlan) {
        loadStrategicPlanFromData(selectedPlan);
      }
    } else {
      // No plan selected or no plans available
      setGoals([]);
      setHasData(false);
    }
  }, [selectedPlanId, allPlans]);

  const loadAllPlans = async () => {
    try {
      const plans = await strategicPlanApi.getStrategicPlans();
      if (plans && Array.isArray(plans)) {
        setAllPlans(plans);
        const planOptions = plans.map(plan => ({
          id: plan.id,
          title: plan.title,
          startYear: plan.startYear,
          endYear: plan.endYear
        }));
        setAvailablePlans(planOptions);
        
        // Don't auto-select - let user choose explicitly
        setSelectedPlanId(plans[0].id);
      }
    } catch (error) {
      console.error('Error loading available plans:', error);
    }
  };

  const loadStrategicPlanFromData = (plan: StrategicPlan) => {
    setIsLoading(true);
    try {
      // Validate plan structure
      if (!plan || !plan.goals || !Array.isArray(plan.goals)) {
        throw new Error('Invalid strategic plan data structure');
      }

      // Use API data directly
      setGoals(plan.goals);
      console.log('Loaded goals:', goals);
      setHasData(true);
      
      // Show success notification
      toast.success(`Loaded strategic plan: ${plan.title}`, {
        description: `Period: ${plan.startYear}-${plan.endYear} | ${plan.goals.length} goals loaded`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error processing strategic plan data:', error);
      setGoals([]);
      setHasData(false);
      toast.error('Failed to load strategic plan data', {
        description: 'Please try selecting a different plan or contact support.',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate summary statistics
  const totalSubgoals = goals.reduce((sum, goal) => sum + goal.subgoals.length, 0);
  const totalActivities = goals.reduce((sum, goal) => 
    sum + goal.subgoals.reduce((subSum, subgoal) => subSum + subgoal.activityLinks.length, 0), 0
  );
  const uniqueProjects = new Set();
  goals.forEach(goal => {
    goal.subgoals.forEach(subgoal => {
      subgoal.activityLinks.forEach(activity => {
        uniqueProjects.add(activity.projectId);
      });
    });
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        {/* Strategic Plan Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Strategic Plan Filter</span>
            </CardTitle>
            <CardDescription>Select a strategic plan to view its goals and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="space-y-2">
                <Label htmlFor="plan-filter">Strategic Plan</Label>
                <Select value={selectedPlanId || ""} onValueChange={(value) => setSelectedPlanId(value || null)}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a strategic plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.title} ({plan.startYear}/{plan.endYear})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isLoading && (
                <div className="text-sm text-muted-foreground">Loading...</div>
              )}
            </div>
          </CardContent>
        </Card>
        <h1 className="text-3xl font-bold text-foreground">Organization Strategic Goals</h1>
        <p className="text-muted-foreground">
          Strategic goals with linked project activities and key performance indicators
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Strategic Goals</p>
                <p className="text-3xl font-bold text-foreground">{goals.length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sub-Goals</p>
                <p className="text-3xl font-bold text-foreground">{totalSubgoals}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contributing Projects</p>
                <p className="text-3xl font-bold text-foreground">{uniqueProjects.size}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Activities</p>
                <p className="text-3xl font-bold text-foreground">{totalActivities}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Goals */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Strategic Goals</h2>
        
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-muted-foreground">Loading strategic plan data...</p>
              </div>
            </CardContent>
          </Card>
        ) : !hasData || goals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <Target className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">No Strategic Plan Data</h3>
                  <p className="text-muted-foreground">
                    {availablePlans.length === 0 
                      ? "No strategic plans found in the database. Create a strategic plan to get started."
                      : "Select a strategic plan from the dropdown above to view goals and activities."
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal) => {
          const overallProgress = getOverallProgress(goal.subgoals);
          
          return (
            <Card key={goal.id} className="transition-all duration-200 hover:shadow-lg cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                        {goal.title}
                      </CardTitle>
                      <Badge className={getPriorityColor(goal.priority.toLowerCase())}>
                        {goal.priority.toLowerCase()} priority
                      </Badge>
                    </div>
                    <CardDescription className="text-base">{goal.description}</CardDescription>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {goal.subgoals.length} sub-goals
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {goal.subgoals.reduce((sum, sg) => sum + sg.activityLinks.length, 0)} activities
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Overall Progress: {overallProgress}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <Link 
                      to={`/dashboard/goals/${goal.id}`}
                      state={{ goal, goals }}
                    >
                      <Button variant="outline" className="group-hover:bg-blue-50 group-hover:border-blue-200">
                        View Details
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                    <div className="text-right">
                      <Progress value={overallProgress} className="w-32" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {goal.subgoals.map((subgoal) => (
                    <Card key={subgoal.id} className="bg-muted/50 hover:bg-muted/70 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base font-semibold leading-tight">
                            {subgoal.title}
                          </CardTitle>
                          <Link 
                            to={`/dashboard/goals/${goal.id}/subgoals/${subgoal.id}`}
                            state={{ goal, goals }}
                          >
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Activity className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {subgoal.activityLinks.length} contributing activities
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {subgoal.kpi.type === 'radialGauge' && (
                          <div className="flex justify-center">
                            <RadialGauge 
                              value={(subgoal.kpi.currentValue / subgoal.kpi.targetValue) * 100} 
                              size={100} 
                              unit={subgoal.kpi.unit} 
                              primaryColor="#3B82F6"
                              max={100}
                            />
                          </div>
                        )}
                        {subgoal.kpi.type === 'bulletChart' && (
                          <BulletChart
                            current={subgoal.kpi.currentValue}
                            target={subgoal.kpi.targetValue}
                            title={subgoal.title}
                            unit={subgoal.kpi.unit}
                            height={80}
                          />
                        )}
                        {subgoal.kpi.type === 'progressBar' && (
                          <div className="w-full">
                            <div className="mb-2 text-sm font-medium">
                              {subgoal.kpi.currentValue.toLocaleString()} / {subgoal.kpi.targetValue.toLocaleString()} {subgoal.kpi.unit}
                            </div>
                            <Progress value={(subgoal.kpi.currentValue / subgoal.kpi.targetValue) * 100} className="h-2" />
                            <div className="mt-1 text-xs text-muted-foreground">
                              {Math.round((subgoal.kpi.currentValue / subgoal.kpi.targetValue) * 100)}% Complete
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
        )}
      </div>
    </div>
  );
}