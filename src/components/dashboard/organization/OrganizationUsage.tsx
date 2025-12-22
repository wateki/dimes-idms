import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabaseOrganizationService, UsageStats } from '@/services/supabaseOrganizationService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, FolderOpen, Database, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function OrganizationUsage() {
  const { organization, loading: orgLoading } = useOrganization();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      loadUsageStats();
    }
  }, [organization]);

  const loadUsageStats = async () => {
    try {
      setLoading(true);
      const stats = await supabaseOrganizationService.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
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
        <h1 className="text-3xl font-bold">Usage & Limits</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your organization's resource usage
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

      {/* Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Users Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Users</span>
            </CardTitle>
            <CardDescription>
              Active users in your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Usage</span>
                <span className="font-medium">
                  {usageStats.users.current} / {usageStats.users.limit}
                </span>
              </div>
              <Progress 
                value={usageStats.users.percentage} 
                className={isUsersNearLimit ? 'bg-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {usageStats.users.percentage}% of limit used
              </p>
            </div>
            {isUsersNearLimit && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Approaching user limit. Upgrade to add more users.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Projects Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5" />
              <span>Projects</span>
            </CardTitle>
            <CardDescription>
              Active projects in your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Usage</span>
                <span className="font-medium">
                  {usageStats.projects.current} / {usageStats.projects.limit}
                </span>
              </div>
              <Progress 
                value={usageStats.projects.percentage} 
                className={isProjectsNearLimit ? 'bg-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {usageStats.projects.percentage}% of limit used
              </p>
            </div>
            {isProjectsNearLimit && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Approaching project limit. Upgrade to create more projects.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Storage</span>
            </CardTitle>
            <CardDescription>
              File storage used by your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Usage</span>
                <span className="font-medium">
                  {formatBytes(usageStats.storage.current)} / {formatBytes(usageStats.storage.limit)}
                </span>
              </div>
              <Progress 
                value={usageStats.storage.percentage} 
                className={isStorageNearLimit ? 'bg-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {usageStats.storage.percentage}% of limit used
              </p>
            </div>
            {isStorageNearLimit && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Approaching storage limit. Upgrade for more storage.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

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
        </CardContent>
      </Card>
    </div>
  );
}

