import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function OrganizationSubscription() {
  const { organization, loading: orgLoading } = useOrganization();

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trialing: 'secondary',
      past_due: 'destructive',
      cancelled: 'outline',
      suspended: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (orgLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Organization not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = organization.subscriptionExpiresAt 
    ? new Date(organization.subscriptionExpiresAt) < new Date()
    : false;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization's subscription and billing
        </p>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>
            Your organization's active subscription plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold capitalize">{organization.subscriptionTier}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {getStatusBadge(organization.subscriptionStatus)}
              </p>
            </div>
            <Button>
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          </div>

          {isExpired && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertDescription>
                Your subscription has expired. Please renew to continue using all features.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Subscription Status</p>
              <p className="text-lg font-medium capitalize">{organization.subscriptionStatus}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Expires At</p>
              <p className="text-lg font-medium">
                {formatDate(organization.subscriptionExpiresAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Max Users</p>
              <p className="text-lg font-medium">{organization.maxUsers}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Max Projects</p>
              <p className="text-lg font-medium">{organization.maxProjects}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
          <CardDescription>
            Features included in your current plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Up to {organization.maxUsers} users</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Up to {organization.maxProjects} projects</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Unlimited forms and reports</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>Email support</span>
            </div>
            {organization.subscriptionTier !== 'free' && (
              <>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Priority support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Advanced analytics</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View your past invoices and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Billing history will appear here</p>
            <p className="text-sm mt-2">This feature is coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

