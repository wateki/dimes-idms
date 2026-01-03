import React from 'react';
import { useParams } from 'react-router-dom';
import { PublicOrganizationLoader, usePublicOrganization } from './PublicOrganizationLoader';
import { FeedbackProvider } from '@/contexts/FeedbackContext';
import { FeedbackSubmissionInterface } from '@/components/dashboard/feedback/FeedbackSubmissionInterface';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

function PublicFeedbackSubmissionContent() {
  const { organization, loading, error } = usePublicOrganization();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Loading feedback form...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Organization Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'The organization you are looking for does not exist or is not active.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FeedbackProvider projectId="organization">
      <FeedbackSubmissionInterface 
        projectId="organization"
        organizationId={organization.id}
        organization={organization}
      />
    </FeedbackProvider>
  );
}

export function PublicFeedbackSubmission() {
  const { organizationId } = useParams<{ organizationId: string }>();

  if (!organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">
              The feedback link is missing the organization identifier.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PublicOrganizationLoader organizationId={organizationId}>
      <PublicFeedbackSubmissionContent />
    </PublicOrganizationLoader>
  );
}


