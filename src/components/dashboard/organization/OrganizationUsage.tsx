import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabaseOrganizationService, OrganizationStats } from '@/services/supabaseOrganizationService';
import { supabaseLimitCheckService, UsageLimitInfo } from '@/services/supabaseLimitCheckService';
import { UsageMetric } from '@/services/supabaseUsageTrackingService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, FolderOpen, Database, AlertCircle, FileText, BarChart2, Link as LinkIcon, MessageSquare, Table, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

interface MetricDisplayInfo {
  name: string;
  icon: React.ReactNode;
  formatValue: (value: number) => string;
  showProgress: boolean;
}

const METRIC_DISPLAY_MAP: Record<UsageMetric, MetricDisplayInfo> = {
  users: {
    name: 'Users',
    icon: <Users className="h-5 w-5 text-muted-foreground" />,
    formatValue: (value) => value.toString(),
    showProgress: true,
  },
  projects: {
    name: 'Projects',
    icon: <FolderOpen className="h-5 w-5 text-muted-foreground" />,
    formatValue: (value) => value.toString(),
    showProgress: true,
  },
  forms: {
    name: 'Forms',
    icon: <FileText className="h-5 w-5 text-muted-foreground" />,
    formatValue: (value) => value.toString(),
    showProgress: true,
  },
  form_responses: {
    name: 'Form Responses',
    icon: <MessageSquare className="h-5 w-5 text-muted-foreground" />,
    formatValue: (value) => value.toLocaleString(),
    showProgress: true,
  },
  reports: {
    name: 'Reports',
    icon: <BarChart2 className="h-5 w-5 text-muted-foreground" />,
    formatValue: (value) => value.toString(),
    showProgress: true,
  },
  feedback_forms: {
    name: 'Feedback Forms',
    icon: <MessageSquare className="h-5 w-5 text-muted-foreground" />,
    formatValue: (value) => value.toString(),
    showProgress: true,
  },
  feedback_submissions: {
    name: 'Feedback Submissions',
    icon: <MessageSquare className="h-5 w-5 text-muted-foreground" />,
    formatValue: (value) => value.toLocaleString(),
    showProgress: true,
  },
  kobo_tables: {
    name: 'Kobo Integrations',
    icon: <Table className="h-5 w-5 text-muted-foreground" />,
    formatValue: (value) => value.toString(),
    showProgress: true,
  },
  strategic_plans: {
    name: 'Strategic Plans',
    icon: <Target className="h-5 w-5 text-muted-foreground" />,
    formatValue: (value) => value.toString(),
    showProgress: true,
  },
  storage_gb: {
    name: 'Storage',
    icon: <Database className="h-5 w-5 text-muted-foreground" />,
    formatValue: (value) => formatBytes(value * 1024 * 1024 * 1024), // Convert GB to bytes for formatting
    showProgress: true,
  },
};

interface PlanDetails {
  displayName: string;
  tierName: string;
  status: string;
  isAnnual: boolean;
}

export function OrganizationUsage() {
  const { organization, loading: orgLoading } = useOrganization();
  const [usageLimitInfo, setUsageLimitInfo] = useState<UsageLimitInfo[]>([]);
  const [orgStats, setOrgStats] = useState<OrganizationStats | null>(null);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      loadAllStats();
    }
  }, [organization]);

  const loadAllStats = async () => {
    try {
      setLoading(true);
      const [usageInfo, stats, plan] = await Promise.all([
        supabaseLimitCheckService.getAllUsageLimitInfo(),
        supabaseOrganizationService.getOrganizationStats(),
        supabaseLimitCheckService.getPlanDetails()
      ]);
      setUsageLimitInfo(usageInfo);
      setOrgStats(stats);
      setPlanDetails(plan);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!organization || usageLimitInfo.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Unable to load usage statistics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter out metrics that are not enabled (limit = 0) or check if any are near limit
  const enabledMetrics = usageLimitInfo.filter(info => info.limit !== 0);
  const metricsNearLimit = enabledMetrics.filter(info => info.isNearLimit || info.isAtLimit);

  // Get limits for display in Current Plan card
  const usersLimit = usageLimitInfo.find(info => info.metric === 'users');
  const projectsLimit = usageLimitInfo.find(info => info.metric === 'projects');
  const usersLimitText = usersLimit?.isUnlimited ? 'Unlimited' : (usersLimit?.limit ?? organization.maxUsers ?? 0).toString();
  const projectsLimitText = projectsLimit?.isUnlimited ? 'Unlimited' : (projectsLimit?.limit ?? organization.maxProjects ?? 0).toString();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{organization.name}</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your organization's resource usage and statistics
        </p>
      </div>

      {/* Alerts */}
      {metricsNearLimit.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {metricsNearLimit.length === 1 
              ? `${METRIC_DISPLAY_MAP[metricsNearLimit[0].metric]?.name || metricsNearLimit[0].metric} limit is approaching.`
              : `${metricsNearLimit.length} resources are approaching their limits.`
            } Consider upgrading your plan.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>
            Monitor your organization's resource usage and limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {enabledMetrics.map((info, index) => {
              const displayInfo = METRIC_DISPLAY_MAP[info.metric];
              if (!displayInfo) return null;

              // Use actual counts from orgStats when available, fallback to subscription_usage
              let actualUsage = info.currentUsage;
              if (info.metric === 'users' && orgStats) {
                // For users, use active users count (matches limit enforcement)
                actualUsage = orgStats.activeUsers || 0;
              } else if (info.metric === 'projects' && orgStats) {
                // For projects, use active projects count (matches limit enforcement)
                actualUsage = orgStats.activeProjects || 0;
              } else if (info.metric === 'forms' && orgStats) {
                actualUsage = orgStats.totalForms || 0;
              } else if (info.metric === 'reports' && orgStats) {
                actualUsage = orgStats.totalReports || 0;
              }

              // Recalculate percentage and limit status based on actual usage
              const isUnlimited = info.isUnlimited;
              const limit = info.limit;
              const percentage = isUnlimited ? 0 : limit > 0 ? Math.round((actualUsage / limit) * 100) : 0;
              const isAtLimit = !isUnlimited && actualUsage >= limit;
              const isNearLimit = !isUnlimited && percentage >= 80;

              const limitText = isUnlimited ? 'Unlimited' : displayInfo.formatValue(limit);
              const currentText = displayInfo.formatValue(actualUsage);
              
              // Get additional stats for specific metrics
              let additionalInfo: string | null = null;
              if (info.metric === 'users' && orgStats) {
                additionalInfo = `${orgStats.totalUsers || 0} total (${orgStats.activeUsers || 0} active)`;
              } else if (info.metric === 'projects' && orgStats) {
                additionalInfo = `${orgStats.totalProjects || 0} total (${orgStats.activeProjects || 0} active)`;
              } else if (info.metric === 'storage_gb') {
                additionalInfo = `${currentText} used`;
              }

              return (
                <div 
                  key={info.metric} 
                  className={index > 0 ? 'space-y-2 pt-2 border-t' : 'space-y-2'}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {displayInfo.icon}
                      <span className="font-medium">{displayInfo.name}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      {additionalInfo && (
                        <span className="text-muted-foreground">{additionalInfo}</span>
                      )}
                      <span className="font-medium">
                        {isUnlimited 
                          ? `${currentText} / ${limitText}`
                          : `${currentText} / ${limitText}`
                        }
                      </span>
                      {!isUnlimited && (
                        <span className={`font-semibold ${isNearLimit ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                  {displayInfo.showProgress && !isUnlimited && (
                    <Progress 
                      value={percentage} 
                      className={isNearLimit ? 'bg-red-500' : ''}
                    />
                  )}
                  {info.isUnlimited && (
                    <p className="text-sm text-muted-foreground ml-7">No limit</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Warning Alerts */}
          {metricsNearLimit.length > 0 && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {metricsNearLimit.map((info, idx) => {
                  const name = METRIC_DISPLAY_MAP[info.metric]?.name || info.metric;
                  return (
                    <span key={info.metric}>
                      {name} limit {info.isAtLimit ? 'reached' : 'approaching'}
                      {idx < metricsNearLimit.length - 1 ? '. ' : '. '}
                    </span>
                  );
                })}
                Consider upgrading your plan to increase limits.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Plan Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your organization's subscription details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold">
                {planDetails?.displayName || (organization.subscriptionTier 
                  ? organization.subscriptionTier.charAt(0).toUpperCase() + organization.subscriptionTier.slice(1)
                  : 'Free')}
                {planDetails?.isAnnual && (
                  <span className="text-sm text-muted-foreground ml-1">(Annual)</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold capitalize">
                {planDetails?.status || organization.subscriptionStatus}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Users</p>
              <p className="text-lg font-semibold">{usersLimitText}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Projects</p>
              <p className="text-lg font-semibold">{projectsLimitText}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <Link to="/dashboard/organization/subscription">
              <Button variant="outline" className="w-full">
                <LinkIcon className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

