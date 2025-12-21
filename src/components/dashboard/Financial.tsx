import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createEnhancedPermissionManager } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Activity as ActivityIcon,
  Calculator,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { 
  LegacyActivityFinancialData, 
  FinancialSummary,
  Activity 
} from '@/types/dashboard';
import { 
  financialApi,
  ProjectFinancialData,
  ActivityFinancialData,
  CreateProjectFinancialDataDto,
  CreateActivityFinancialDataDto,
  UpdateActivityFinancialDataDto
} from '@/lib/api/financialApi';
import { format } from 'date-fns';
import { FinancialCharts } from './FinancialCharts';
import { AddFinancialDataModal } from './modals/AddFinancialDataModal';

export default function Financial() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const permissionManager = createEnhancedPermissionManager({ user, isAuthenticated, isLoading: authLoading });
  const canRead = projectId ? permissionManager.canAccessProjectComponent(projectId, 'finance', 'read') : false;
  const canWrite = projectId ? (
    permissionManager.hasProjectPermission('finance', 'update', projectId) ||
    permissionManager.hasResourcePermission('finance', 'update', 'regional') ||
    permissionManager.hasResourcePermission('finance', 'update', 'global')
  ) : false;
  const { currentProject } = useDashboard();
  const { projects, getProjectActivities } = useProjects();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'TZS' | 'KSH' | 'CIF'>('USD');
  const [projectFinancialData, setProjectFinancialData] = useState<ProjectFinancialData | null>(null);
  const [activitiesFinancialData, setActivitiesFinancialData] = useState<ActivityFinancialData[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for project activities
  const [projectActivities, setProjectActivities] = useState<Activity[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Currency conversion rates (example rates - in production, these should come from an API)
  const currencyRates = {
    USD: 1,
    TZS: 2500, // 1 USD = 2500 TZS (approximate)
    KSH: 150,  // 1 USD = 150 KSH (approximate)
    CIF: 1.1   // 1 USD = 1.1 CIF (approximate)
  };

  // Helper function to convert amount to selected currency
  const convertCurrency = (amount: number, fromCurrency: 'USD' = 'USD'): number => {
    if (fromCurrency === selectedCurrency) return amount;
    return amount * currencyRates[selectedCurrency] / currencyRates[fromCurrency];
  };

  // Helper function to get currency symbol
  const getCurrencySymbol = (currency: string): string => {
    switch (currency) {
      case 'USD': return '$';
      case 'TZS': return 'TSh';
      case 'KSH': return 'KSh';
      case 'CIF': return 'CIF';
      default: return '$';
    }
  };

  // Helper function to format currency amount
  const formatCurrency = (amount: number): string => {
    const convertedAmount = convertCurrency(amount);
    const symbol = getCurrencySymbol(selectedCurrency);
    
    if (selectedCurrency === 'USD') {
      return `${symbol}${convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `${symbol} ${convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
  };

  useEffect(() => {
    if (projectId) {
      loadFinancialData();
      loadActivities();
    }
  }, [projectId, selectedYear]);

  const loadActivities = async () => {
    if (!projectId) return;
    try {
      const activities = await getProjectActivities(projectId);
      setProjectActivities(activities);
    } catch (error) {
      console.error('Error loading activities:', error);
      setError('Failed to load project activities');
    }
  };

  const loadFinancialData = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading financial data for project:', projectId, 'year:', selectedYear);
      
      // Load activities financial data first (independent of project financial data)
        const activities = await getProjectActivities(projectId);
        const allActivitiesData: ActivityFinancialData[] = [];
        
        for (const activity of activities) {
          try {
            const activityFinancialData = await financialApi.getActivityFinancialData(activity.id, selectedYear);
            allActivitiesData.push(...activityFinancialData);
          console.log(`✅ Loaded financial data for activity ${activity.title}:`, activityFinancialData.length, 'records');
          } catch (err) {
            // Activity doesn't have financial data yet, skip
          console.log(`⏭️ No financial data for activity ${activity.title}`);
          }
        }
        
        setActivitiesFinancialData(allActivitiesData);
      console.log('📊 Total activities with financial data:', allActivitiesData.length);
      
      // Load project financial data
      const projectData = await financialApi.getProjectFinancialData(projectId, selectedYear);
      
      // Ensure projectData is an array and handle null/undefined responses
      const safeProjectData = Array.isArray(projectData) ? projectData : [];
      setProjectFinancialData(safeProjectData.length > 0 ? safeProjectData[0] : null);
      console.log('🏢 Project financial data:', safeProjectData.length > 0 ? 'Found' : 'Not found');
      
      // Try to load summary regardless of project data (activities might exist without project summary)
      try {
        const summaryData = await financialApi.getFinancialSummary(projectId, selectedYear);
        // Convert lastUpdated from string to Date for the component interface
        setSummary({
          ...summaryData,
          lastUpdated: new Date(summaryData.lastUpdated),
        });
        console.log('📈 Summary data loaded:', summaryData);
      } catch (summaryError) {
        console.log('⚠️ No summary data available for year', selectedYear);
        setSummary(null);
      }
      
    } catch (error: any) {
      console.error('❌ Error loading financial data:', error);
      const errorMessage = error.message || 'Failed to load financial data';
      setError(`Failed to load financial data: ${errorMessage}`);
      setProjectFinancialData(null);
      setSummary(null);
      setActivitiesFinancialData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const ensureProjectFinancialData = async () => {
    console.log('🔍 ensureProjectFinancialData - Checking conditions');
    console.log('📋 projectId:', projectId);
    console.log('📁 currentProject:', currentProject?.name);
    console.log('💰 existing projectFinancialData:', projectFinancialData);
    
    if (!projectId || !currentProject || projectFinancialData) {
      console.log('⏭️ Skipping project financial data creation - conditions not met or data already exists');
      return projectFinancialData;
    }
    
    console.log('✨ Creating new project financial data...');
    try {
      const createDto: CreateProjectFinancialDataDto = {
        projectId,
        year: selectedYear,
        projectName: currentProject.name,
        totalBudget: 0,
      };
      
      console.log('📤 Sending POST request to create project financial data:', createDto);
      const newProjectData = await financialApi.createProjectFinancialData(createDto);
      console.log('✅ Project financial data created:', newProjectData);
      setProjectFinancialData(newProjectData);
      return newProjectData;
    } catch (error) {
      console.error('❌ Error creating project financial data:', error);
      setError('Failed to create financial data');
      return null;
    }
  };

  const addActivityFinancialData = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: CreateActivityFinancialDataDto) => {
    if (!projectId || !currentProject) return;
    
    console.log('📊 Financial Modal Submit - Starting');
    console.log('📋 Raw form data:', data);
    console.log('🎯 Project ID:', projectId);
    console.log('📁 Current Project:', currentProject);
    
    try {
      // First ensure project financial data exists
      console.log('🔄 Ensuring project financial data exists...');
      await ensureProjectFinancialData();
      
      console.log('💰 Creating activity financial data...');
      console.log('📤 Data being sent to API:', JSON.stringify(data, null, 2));
      const newActivityData = await financialApi.createActivityFinancialData(data);
      console.log('✅ Activity financial data created:', newActivityData);
      setActivitiesFinancialData(prev => [...prev, newActivityData]);
      
      // Reload summary to reflect changes
      console.log('🔄 Reloading financial data...');
      await loadFinancialData();
    } catch (error) {
      console.error('Error adding activity financial data:', error);
      setError('Failed to add activity financial data');
      throw error; // Re-throw to let modal handle the error
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  };

  const updateActivityData = async (activityId: string, updates: Partial<LegacyActivityFinancialData>) => {
    try {
      const existingActivity = activitiesFinancialData.find(a => a.activityId === activityId);
      if (!existingActivity) return;
      
      // Convert legacy format to API format
      const updateDto: UpdateActivityFinancialDataDto = {};
      
      if (updates.totalAnnualBudget !== undefined) {
        updateDto.totalAnnualBudget = updates.totalAnnualBudget;
      }
      
      if (updates.quarterlyCosts) {
        updateDto.q1Cost = updates.quarterlyCosts.q1;
        updateDto.q2Cost = updates.quarterlyCosts.q2;
        updateDto.q3Cost = updates.quarterlyCosts.q3;
        updateDto.q4Cost = updates.quarterlyCosts.q4;
      }
      
      if (updates.notes !== undefined) {
        updateDto.notes = updates.notes;
      }
      
      const updatedActivity = await financialApi.updateActivityFinancialData(existingActivity.id, updateDto);
      
      setActivitiesFinancialData(prev => 
        prev.map(activity => 
          activity.id === existingActivity.id ? updatedActivity : activity
        )
      );
      
      // Reload summary to reflect changes
      await loadFinancialData();
    } catch (error) {
      console.error('Error updating activity financial data:', error);
      setError('Failed to update activity financial data');
    }
  };

  const removeActivityFinancialData = async (activityId: string) => {
    try {
      const existingActivity = activitiesFinancialData.find(a => a.activityId === activityId);
      if (!existingActivity) return;
      
      await financialApi.deleteActivityFinancialData(existingActivity.id);
      
      setActivitiesFinancialData(prev => 
        prev.filter(activity => activity.id !== existingActivity.id)
      );
      
      // Reload summary to reflect changes
      await loadFinancialData();
    } catch (error) {
      console.error('Error removing activity financial data:', error);
      setError('Failed to remove activity financial data');
    }
  };

  const saveFinancialData = () => {
    setIsEditing(false);
    loadFinancialData();
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600 bg-green-100';
    if (variance < 0) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4" />;
    if (variance < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Helper function to convert ActivityFinancialData to LegacyActivityFinancialData for UI compatibility
  const convertToLegacyFormat = (activity: ActivityFinancialData): LegacyActivityFinancialData => ({
    id: activity.id,
    activityId: activity.activityId,
    activityTitle: activity.activityTitle,
    year: activity.year,
    quarterlyCosts: {
      q1: activity.q1Cost,
      q2: activity.q2Cost,
      q3: activity.q3Cost,
      q4: activity.q4Cost,
    },
    totalAnnualBudget: activity.totalAnnualBudget,
    totalAnnualCost: activity.totalAnnualCost,
    variance: activity.variance,
    notes: activity.notes ?? undefined,
    lastUpdated: new Date(activity.lastUpdated),
    createdBy: '', // Not available in new format
  });

  const legacyActivitiesData = activitiesFinancialData.map(convertToLegacyFormat);

  return (
    <div className="p-6 space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={() => {
                setError(null);
                loadFinancialData();
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Tracking</h1>
          <p className="text-gray-600">
            Track costs, budgets, and variances for {currentProject?.name}
          </p>
          {selectedCurrency !== 'USD' && (
            <p className="text-sm text-blue-600 mt-1">
              💱 Displaying amounts in {selectedCurrency}. All data is stored in USD and converted for display.
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedCurrency} onValueChange={(value: 'USD' | 'TZS' | 'KSH' | 'CIF') => setSelectedCurrency(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="TZS">TZS (TSh)</SelectItem>
              <SelectItem value="KSH">KSH (KSh)</SelectItem>
              <SelectItem value="CIF">CIF</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant={isEditing ? "default" : "outline"}
            onClick={() => isEditing ? saveFinancialData() : setIsEditing(true)}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            {isEditing ? (
              <>
                <Calculator className="w-4 h-4" />
                Save Changes
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Edit Financial Data
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Always show the full financial interface with indicators when no data */}
        <Tabs defaultValue={canWrite ? 'forms' : 'overview'} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {canWrite && <TabsTrigger value="forms">Data Entry</TabsTrigger>}
            {canRead && <TabsTrigger value="activities">Activities</TabsTrigger>}
            {canRead && <TabsTrigger value="quarterly">Quarterly Breakdown</TabsTrigger>}
            {canRead && <TabsTrigger value="charts">Charts</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {!summary && activitiesFinancialData.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Financial Data Available</h3>
                  <p className="text-sm text-gray-600">
                    No financial data has been recorded for {selectedYear}. Use the Data Entry tab to start adding financial information.
                  </p>
                </CardContent>
              </Card>
            ) : summary ? (
              <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summary?.totalBudget || 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(summary?.totalSpent || 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Variance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold flex items-center gap-2 ${getVarianceColor(summary?.totalVariance || 0)}`}>
                    {getVarianceIcon(summary?.totalVariance || 0)}
                    {formatCurrency(Math.abs(summary?.totalVariance || 0))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Spent: {formatCurrency(summary?.totalSpent || 0)}</span>
                    <span>Budget: {formatCurrency(summary?.totalBudget || 0)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${summary?.totalBudget ? (summary.totalSpent / summary.totalBudget) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {summary?.totalBudget ? `${((summary.totalSpent / summary.totalBudget) * 100).toFixed(1)}%` : '0%'} utilized
                  </div>
                </div>
              </CardContent>
            </Card>
              </>
            ) : (
              // Fallback when we have activity data but no summary
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Activity Financial Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Budget</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(activitiesFinancialData.reduce((sum, activity) => sum + (activity.totalAnnualBudget || 0), 0))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(activitiesFinancialData.reduce((sum, activity) => sum + (activity.totalAnnualCost || 0), 0))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Variance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold flex items-center gap-2 ${getVarianceColor(activitiesFinancialData.reduce((sum, activity) => sum + (activity.variance || 0), 0))}`}>
                          {getVarianceIcon(activitiesFinancialData.reduce((sum, activity) => sum + (activity.variance || 0), 0))}
                          {formatCurrency(Math.abs(activitiesFinancialData.reduce((sum, activity) => sum + (activity.variance || 0), 0)))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Summary calculations are based on activity-level data. 
                      For comprehensive reporting, ensure project-level financial data is also configured.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Data Entry Tab */}
          <TabsContent value="forms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Financial Data Entry Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">How to Enter Financial Data</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Total Annual Budget:</strong> Enter the budget allocated for each activity</li>
                      <li>• <strong>Cost per Quarter:</strong> Enter actual costs incurred in each quarter (Q1, Q2, Q3, Q4)</li>
                      <li>• <strong>Total Annual Cost:</strong> Automatically calculated from quarterly costs</li>
                      <li>• <strong>Variance:</strong> Automatically calculated (Budget - Actual Cost)</li>
                    </ul>
                  </div>

                  {projectActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No activities found for this project.</p>
                      <p className="text-sm text-gray-500">Activities need to be added to the project first.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projectActivities.map(activity => {
                        const existingData = legacyActivitiesData.find(
                          financialActivity => financialActivity.activityId === activity.id
                        );
                        
                        return (
                          <Card key={activity.id} className="border-2 border-gray-200">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{activity.title}</CardTitle>
                                {existingData ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    Data Entered
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    No Data
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              {existingData ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div>
                                      <Label className="text-sm text-gray-600">Annual Budget</Label>
                                      <div className="text-lg font-semibold text-blue-600">
                                        {formatCurrency(existingData.totalAnnualBudget)}
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-gray-600">Annual Cost</Label>
                                      <div className="text-lg font-semibold text-orange-600">
                                        {formatCurrency(existingData.totalAnnualCost)}
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-gray-600">Variance</Label>
                                      <div className={`text-lg font-semibold flex items-center gap-1 ${getVarianceColor(existingData.variance)}`}>
                                        {getVarianceIcon(existingData.variance)}
                                        {formatCurrency(Math.abs(existingData.variance))}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      // Navigate to activities tab and expand this activity
                                      const activitiesTab = document.querySelector('[data-value="activities"]') as HTMLElement;
                                      if (activitiesTab) activitiesTab.click();
                                    }}
                                    className="w-full"
                                  >
                                    View/Edit Details
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <p className="text-sm text-gray-600">
                                    No financial data has been entered for this activity yet.
                                  </p>
                                  <Button
                                    onClick={() => addActivityFinancialData(activity)}
                                    className="w-full"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Financial Data
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ActivityIcon className="w-5 h-5" />
                  Activity Financial Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                {legacyActivitiesData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">No activities have financial data yet.</p>
                    <div className="space-y-2">
                      {projectActivities.map(activity => (
                        <Button
                          key={activity.id}
                          variant="outline"
                          onClick={() => addActivityFinancialData(activity)}
                          className="w-full justify-start"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add financial data for: {activity.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {legacyActivitiesData.map((activityData) => (
                      <ActivityFinancialCard
                        key={activityData.id}
                        activityData={activityData}
                        isEditing={isEditing}
                        onUpdate={updateActivityData}
                        onRemove={removeActivityFinancialData}
                        formatCurrency={formatCurrency}
                        getCurrencySymbol={getCurrencySymbol}
                        selectedCurrency={selectedCurrency}
                      />
                    ))}
                    
                    {/* Add more activities button */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <p className="text-gray-600 mb-4">Add financial data for more activities</p>
                      <div className="space-y-2">
                        {projectActivities
                          .filter(activity => !legacyActivitiesData.some(financialActivity => financialActivity.activityId === activity.id))
                          .map(activity => (
                            <Button
                              key={activity.id}
                              variant="outline"
                              onClick={() => addActivityFinancialData(activity)}
                              className="w-full justify-start"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add financial data for: {activity.title}
                            </Button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

           {/* Charts Tab */}
           <TabsContent value="charts" className="space-y-4">
             {!summary && activitiesFinancialData.length === 0 ? (
               <Card>
                 <CardContent className="p-8 text-center">
                   <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                   <h3 className="text-lg font-medium text-gray-900 mb-2">No Chart Data Available</h3>
                   <p className="text-sm text-gray-600">
                     Financial charts will be displayed once data is available for {selectedYear}.
                   </p>
                 </CardContent>
               </Card>
             ) : summary ? (
               <FinancialCharts summary={summary} />
             ) : (
               <Card>
                 <CardContent className="p-8 text-center">
                   <TrendingUp className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                   <h3 className="text-lg font-medium text-gray-900 mb-2">Charts Coming Soon</h3>
                   <p className="text-sm text-gray-600">
                     Activity-level financial data has been detected. Charts will be enhanced to display this data in a future update.
                   </p>
                   <div className="mt-4 text-sm text-blue-600">
                     Activities with data: {activitiesFinancialData.length}
                   </div>
                 </CardContent>
               </Card>
             )}
           </TabsContent>

           {/* Quarterly Breakdown Tab */}
           <TabsContent value="quarterly" className="space-y-4">
             {!summary && activitiesFinancialData.length === 0 ? (
               <Card>
                 <CardContent className="p-8 text-center">
                   <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                   <h3 className="text-lg font-medium text-gray-900 mb-2">No Quarterly Data Available</h3>
                   <p className="text-sm text-gray-600">
                     Quarterly financial breakdown will be available once data is recorded for {selectedYear}.
                   </p>
                 </CardContent>
               </Card>
             ) : summary ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Quarterly Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Quarter</th>
                        <th className="text-right p-2">Budget</th>
                        <th className="text-right p-2">Spent</th>
                        <th className="text-right p-2">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['q1', 'q2', 'q3', 'q4'].map((quarter) => (
                        <tr key={quarter} className="border-b">
                          <td className="p-2 font-medium">{quarter.toUpperCase()}</td>
                          <td className="p-2 text-right text-blue-600">
                            {formatCurrency(summary?.byQuarter[quarter as keyof typeof summary.byQuarter].budget || 0)}
                          </td>
                          <td className="p-2 text-right text-orange-600">
                            {formatCurrency(summary?.byQuarter[quarter as keyof typeof summary.byQuarter].spent || 0)}
                          </td>
                          <td className="p-2 text-right">
                            <Badge className={getVarianceColor(summary?.byQuarter[quarter as keyof typeof summary.byQuarter].variance || 0)}>
                              {getVarianceIcon(summary?.byQuarter[quarter as keyof typeof summary.byQuarter].variance || 0)}
                              {formatCurrency(Math.abs(summary?.byQuarter[quarter as keyof typeof summary.byQuarter].variance || 0))}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
             ) : (
               // Fallback quarterly breakdown based on activity data
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Calendar className="w-5 h-5" />
                     Quarterly Breakdown (Activity-based)
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="overflow-x-auto">
                     <table className="w-full">
                       <thead>
                         <tr className="border-b">
                           <th className="text-left p-2">Quarter</th>
                           <th className="text-right p-2">Budget</th>
                           <th className="text-right p-2">Spent</th>
                           <th className="text-right p-2">Variance</th>
                         </tr>
                       </thead>
                       <tbody>
                         {['q1', 'q2', 'q3', 'q4'].map((quarter) => {
                           const quarterBudget = activitiesFinancialData.reduce((sum, activity) => sum + (activity.totalAnnualBudget / 4), 0);
                           const quarterSpent = activitiesFinancialData.reduce((sum, activity) => {
                             const quarterCost = quarter === 'q1' ? activity.q1Cost : 
                                                quarter === 'q2' ? activity.q2Cost :
                                                quarter === 'q3' ? activity.q3Cost : activity.q4Cost;
                             return sum + (quarterCost || 0);
                           }, 0);
                           const variance = quarterBudget - quarterSpent;
                           
                           return (
                             <tr key={quarter} className="border-b">
                               <td className="p-2 font-medium">{quarter.toUpperCase()}</td>
                               <td className="p-2 text-right text-blue-600">
                                 {formatCurrency(quarterBudget)}
                               </td>
                               <td className="p-2 text-right text-orange-600">
                                 {formatCurrency(quarterSpent)}
                               </td>
                               <td className="p-2 text-right">
                                 <Badge className={getVarianceColor(variance)}>
                                   {getVarianceIcon(variance)}
                                   {formatCurrency(Math.abs(variance))}
                                 </Badge>
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                   <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                     <p className="text-sm text-yellow-800">
                       <strong>Note:</strong> Quarterly budget is estimated as annual budget ÷ 4. 
                       Actual quarterly costs are from recorded activity data.
                     </p>
                </div>
              </CardContent>
            </Card>
             )}
          </TabsContent>
        </Tabs>

        {/* Add Financial Data Modal */}
        <AddFinancialDataModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleModalSubmit}
          activity={selectedActivity}
          year={selectedYear}
          isLoading={isLoading}
        />
    </div>
  );
}

interface ActivityFinancialCardProps {
  activityData: LegacyActivityFinancialData;
  isEditing: boolean;
  onUpdate: (activityId: string, updates: Partial<LegacyActivityFinancialData>) => void;
  onRemove: (activityId: string) => void;
  formatCurrency: (amount: number) => string;
  getCurrencySymbol: (currency: string) => string;
  selectedCurrency: 'USD' | 'TZS' | 'KSH' | 'CIF';
}

function ActivityFinancialCard({ activityData, isEditing, onUpdate, onRemove, formatCurrency, getCurrencySymbol, selectedCurrency }: ActivityFinancialCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleQuarterlyCostChange = (quarter: 'q1' | 'q2' | 'q3' | 'q4', value: string) => {
    const numValue = parseFloat(value) || 0;
    onUpdate(activityData.activityId, {
      quarterlyCosts: {
        ...activityData.quarterlyCosts,
        [quarter]: numValue
      }
    });
  };

  const handleBudgetChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    onUpdate(activityData.activityId, { totalAnnualBudget: numValue });
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600 bg-green-100';
    if (variance < 0) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4" />;
    if (variance < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▼' : '▶'}
            </Button>
            <CardTitle className="text-lg">{activityData.activityTitle}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getVarianceColor(activityData.variance)}>
              {getVarianceIcon(activityData.variance)}
              {formatCurrency(Math.abs(activityData.variance))}
            </Badge>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(activityData.activityId)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm text-gray-600">Annual Budget</Label>
              <div className="text-lg font-semibold text-blue-600">
                {formatCurrency(activityData.totalAnnualBudget)}
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Annual Cost</Label>
              <div className="text-lg font-semibold text-orange-600">
                {formatCurrency(activityData.totalAnnualCost)}
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Variance</Label>
              <div className={`text-lg font-semibold flex items-center gap-1 ${getVarianceColor(activityData.variance)}`}>
                {getVarianceIcon(activityData.variance)}
                {formatCurrency(Math.abs(activityData.variance))}
              </div>
            </div>
          </div>

          {/* Financial Data Entry Form */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-3">Financial Data Entry</h4>
              
              {/* Annual Budget Input */}
              <div className="mb-4">
                <Label className="text-sm font-medium text-blue-800">Total Annual Budget *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500">{getCurrencySymbol(selectedCurrency)}</span>
                  <Input
                    type="number"
                    value={activityData.totalAnnualBudget}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    disabled={!isEditing}
                    className="flex-1"
                    placeholder="Enter annual budget"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">Enter the total budget allocated for this activity</p>
              </div>

              {/* Quarterly Costs */}
              <div>
                <Label className="text-sm font-medium text-blue-800">Cost per Quarter *</Label>
                <p className="text-xs text-gray-600 mb-2">Enter the actual costs incurred in each quarter</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['q1', 'q2', 'q3', 'q4'] as const).map((quarter) => (
                    <div key={quarter} className="space-y-1">
                      <Label className="text-xs text-gray-600 font-medium">{quarter.toUpperCase()}</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">{getCurrencySymbol(selectedCurrency)}</span>
                        <Input
                          type="number"
                          value={activityData.quarterlyCosts[quarter]}
                          onChange={(e) => handleQuarterlyCostChange(quarter, e.target.value)}
                          disabled={!isEditing}
                          className="text-sm"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Results */}
            <div className="border rounded-lg p-4 bg-green-50">
              <h4 className="font-medium text-green-900 mb-3">Calculated Results</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-green-800">Total Annual Cost</Label>
                  <div className="text-lg font-semibold text-green-700">
                    {formatCurrency(activityData.totalAnnualCost)}
                  </div>
                  <p className="text-xs text-gray-600">Sum of all quarterly costs</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-800">Variance</Label>
                  <div className={`text-lg font-semibold flex items-center gap-1 ${getVarianceColor(activityData.variance)}`}>
                    {getVarianceIcon(activityData.variance)}
                    {formatCurrency(Math.abs(activityData.variance))}
                  </div>
                  <p className="text-xs text-gray-600">Budget - Actual Cost</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-800">Utilization</Label>
                  <div className="text-lg font-semibold text-green-700">
                    {activityData.totalAnnualBudget > 0 
                      ? `${((activityData.totalAnnualCost / activityData.totalAnnualBudget) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                  <p className="text-xs text-gray-600">Cost as % of budget</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Input
              value={activityData.notes || ''}
              onChange={(e) => onUpdate(activityData.activityId, { notes: e.target.value })}
              disabled={!isEditing}
              className="mt-1"
              placeholder="Add notes about this activity's financial data"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
