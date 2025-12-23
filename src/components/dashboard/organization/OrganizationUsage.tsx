import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabaseOrganizationService, UsageStats, OrganizationStats } from '@/services/supabaseOrganizationService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, FolderOpen, Database, AlertCircle, FileText, BarChart2, Link as LinkIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function OrganizationUsage() {
  const { organization, loading: orgLoading } = useOrganization();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [orgStats, setOrgStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      loadAllStats();
    }
  }, [organization]);

  const loadAllStats = async () => {
    try {
      setLoading(true);
      const [usage, stats] = await Promise.all([
        supabaseOrganizationService.getUsageStats(),
        supabaseOrganizationService.getOrganizationStats()
      ]);
      setUsageStats(usage);
      setOrgStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (orgLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!organization || !usageStats) {
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

  const isUsersNearLimit = usageStats.users.percentage >= 80;
  const isProjectsNearLimit = usageStats.projects.percentage >= 80;
  const isStorageNearLimit = usageStats.storage.percentage >= 80;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{organization.name}</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your organization's resource usage and statistics
        </p>
      </div>

      {/* Alerts */}
      {(isUsersNearLimit || isProjectsNearLimit || isStorageNearLimit) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            One or more resources are approaching their limits. Consider upgrading your plan.
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
            {/* Users Metric */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Users</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-muted-foreground">
                    {orgStats?.totalUsers || 0} total ({orgStats?.activeUsers || 0} active)
                  </span>
                  <span className="font-medium">
                    {usageStats.users.current} / {usageStats.users.limit} limit
                  </span>
                  <span className={`font-semibold ${isUsersNearLimit ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {usageStats.users.percentage}%
                  </span>
                </div>
              </div>
              <Progress 
                value={usageStats.users.percentage} 
                className={isUsersNearLimit ? 'bg-red-500' : ''}
              />
            </div>

            {/* Projects Metric */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Projects</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-muted-foreground">
                    {orgStats?.totalProjects || 0} total ({orgStats?.activeProjects || 0} active)
                  </span>
                  <span className="font-medium">
                    {usageStats.projects.current} / {usageStats.projects.limit} limit
                  </span>
                  <span className={`font-semibold ${isProjectsNearLimit ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {usageStats.projects.percentage}%
                  </span>
                </div>
              </div>
              <Progress 
                value={usageStats.projects.percentage} 
                className={isProjectsNearLimit ? 'bg-red-500' : ''}
              />
            </div>

            {/* Storage Metric */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Storage</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-muted-foreground">
                    {formatBytes(usageStats.storage.current)} used
                  </span>
                  <span className="font-medium">
                    {formatBytes(usageStats.storage.limit)} limit
                  </span>
                  <span className={`font-semibold ${isStorageNearLimit ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {usageStats.storage.percentage}%
                  </span>
                </div>
              </div>
              <Progress 
                value={usageStats.storage.percentage} 
                className={isStorageNearLimit ? 'bg-red-500' : ''}
              />
            </div>

            {/* Forms Metric */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Forms</span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-2xl font-bold">{orgStats?.totalForms || 0}</span>
                <span className="text-muted-foreground">Unlimited</span>
              </div>
            </div>

            {/* Reports Metric */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2">
                <BarChart2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Reports</span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-2xl font-bold">{orgStats?.totalReports || 0}</span>
                <span className="text-muted-foreground">Unlimited</span>
              </div>
            </div>
          </div>

          {/* Warning Alerts */}
          {(isUsersNearLimit || isProjectsNearLimit || isStorageNearLimit) && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isUsersNearLimit && 'Users limit approaching. '}
                {isProjectsNearLimit && 'Projects limit approaching. '}
                {isStorageNearLimit && 'Storage limit approaching. '}
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
              <p className="text-sm text-muted-foreground">Subscription Tier</p>
              <p className="text-lg font-semibold capitalize">{organization.subscriptionTier}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold capitalize">{organization.subscriptionStatus}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Users</p>
              <p className="text-lg font-semibold">{organization.maxUsers}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Projects</p>
              <p className="text-lg font-semibold">{organization.maxProjects}</p>
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

